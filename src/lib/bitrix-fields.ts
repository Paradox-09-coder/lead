// Bitrix24 lead / deal fields (standard + custom UF_CRM_*) as returned by
// crm.lead.fields and crm.deal.fields, trimmed to the ones a Facebook form answer can be written to.

import { CONTACT_FIELD_PREFIX, type CrmEntity } from "@/lib/crm-entity";

export interface CrmFieldItem {
  id: string;
  value: string;
}

export interface CrmFieldDef {
  id: string; // e.g. "NAME", "PHONE", "UF_CRM_1700000000"
  label: string;
  type: string; // Bitrix type: string, integer, double, boolean, date, datetime, enumeration, crm_multifield …
  required: boolean;
  multiple: boolean;
  custom: boolean; // user-created (UF_*)
  items?: CrmFieldItem[]; // enumeration options
}

interface RawField {
  type?: string;
  isRequired?: boolean;
  isReadOnly?: boolean;
  isMultiple?: boolean;
  title?: string;
  listLabel?: string;
  formLabel?: string;
  filterLabel?: string;
  items?: Array<{ ID: string | number; VALUE: string }>;
}

const WRITABLE_TYPES = new Set([
  "string",
  "char",
  "integer",
  "double",
  "boolean",
  "date",
  "datetime",
  "url",
  "enumeration",
  "crm_multifield",
]);

// Fields LeadSync fills itself (or that must not be set from a form answer).
const RESERVED_IDS: Record<CrmEntity, Set<string>> = {
  lead: new Set(["TITLE", "STATUS_ID", "SOURCE_ID", "SOURCE_DESCRIPTION"]),
  deal: new Set([
    "TITLE",
    "STAGE_ID",
    "CATEGORY_ID",
    "SOURCE_ID",
    "SOURCE_DESCRIPTION",
    "CONTACT_ID",
    "CONTACT_IDS",
    "COMPANY_ID",
    "LEAD_ID",
    "QUOTE_ID",
  ]),
};

// The contact a deal is attached to. Its source is the deal's, and company / lead links are not answers.
const CONTACT_RESERVED_IDS = new Set(["SOURCE_ID", "SOURCE_DESCRIPTION", "COMPANY_ID", "COMPANY_IDS", "LEAD_ID"]);

export function bitrixMethodUrl(webhookUrl: string, method: string): URL {
  return new URL(method, webhookUrl.endsWith("/") ? webhookUrl : `${webhookUrl}/`);
}

async function callBitrix<T>(webhookUrl: string, method: string, params?: Record<string, string>): Promise<T> {
  const url = bitrixMethodUrl(webhookUrl, method);
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
  const response = await fetch(url);
  const body = (await response.json().catch(() => null)) as
    | { result?: T; error?: string; error_description?: string }
    | null;
  if (!response.ok || !body || body.error) {
    throw new Error(body?.error_description ?? body?.error ?? `Bitrix24 HTTP ${response.status}`);
  }
  return body.result as T;
}

function toDef(id: string, raw: RawField): CrmFieldDef {
  const custom = id.startsWith("UF_");
  return {
    id,
    label: raw.formLabel || raw.listLabel || raw.filterLabel || raw.title || id,
    type: raw.type ?? "string",
    required: Boolean(raw.isRequired),
    multiple: Boolean(raw.isMultiple),
    custom,
    items: raw.items?.map((item) => ({ id: String(item.ID), value: item.VALUE })),
  };
}

function writableDefs(result: Record<string, RawField> | undefined, reserved: Set<string>): CrmFieldDef[] {
  return Object.entries(result ?? {})
    .filter(([id, raw]) => !raw.isReadOnly && !reserved.has(id) && WRITABLE_TYPES.has(raw.type ?? "string"))
    .map(([id, raw]) => toDef(id, raw));
}

function sortDefs(defs: CrmFieldDef[]): CrmFieldDef[] {
  return defs.sort((a, b) => Number(a.custom) - Number(b.custom) || a.label.localeCompare(b.label));
}

// Every lead field an answer can be written to, standard ones first.
export async function fetchBitrixLeadFields(webhookUrl: string): Promise<CrmFieldDef[]> {
  const result = await callBitrix<Record<string, RawField>>(webhookUrl, "crm.lead.fields");
  return sortDefs(writableDefs(result, RESERVED_IDS.lead));
}

// Every deal field an answer can be written to, plus the fields of the contact the deal is attached to (a deal
// has no name / phone / email of its own). Contact fields come with the CONTACT_FIELD_PREFIX on their id and
// `contactSuffix` after their label so the two kinds can be told apart.
export async function fetchBitrixDealFields(webhookUrl: string, contactSuffix: string): Promise<CrmFieldDef[]> {
  const [dealResult, contactResult] = await Promise.all([
    callBitrix<Record<string, RawField>>(webhookUrl, "crm.deal.fields"),
    callBitrix<Record<string, RawField>>(webhookUrl, "crm.contact.fields"),
  ]);
  const contactDefs = writableDefs(contactResult, CONTACT_RESERVED_IDS).map((def) => ({
    ...def,
    id: `${CONTACT_FIELD_PREFIX}${def.id}`,
    label: `${def.label} (${contactSuffix})`,
    required: false,
  }));
  return sortDefs([...writableDefs(dealResult, RESERVED_IDS.deal), ...contactDefs]);
}

export function fetchBitrixFields(webhookUrl: string, entity: CrmEntity, contactSuffix = "contact"): Promise<CrmFieldDef[]> {
  return entity === "deal" ? fetchBitrixDealFields(webhookUrl, contactSuffix) : fetchBitrixLeadFields(webhookUrl);
}

// Stage list straight from crm.lead.fields' STATUS_ID options. Used when
// crm.status.list is refused (some Bitrix24 plans block it).
export async function fetchBitrixStagesFromFields(webhookUrl: string): Promise<Array<{ id: string; name: string }>> {
  const result = await callBitrix<Record<string, RawField>>(webhookUrl, "crm.lead.fields");
  return (result?.STATUS_ID?.items ?? []).map((item) => ({ id: String(item.ID), name: item.VALUE }));
}

interface DealCategory {
  id: number;
  name: string;
}

// The deal pipelines ("voronka") of the portal, the default one first. crm.category.list is the current API;
// the older crm.dealcategory.* pair is the fallback for portals that refuse it.
async function fetchDealCategories(webhookUrl: string): Promise<DealCategory[]> {
  try {
    const result = await callBitrix<{ categories?: Array<{ id: number | string; name: string; sort?: number }> }>(
      webhookUrl,
      "crm.category.list",
      { entityTypeId: "2" },
    );
    const categories = (result?.categories ?? [])
      .slice()
      .sort((a, b) => Number(a.sort ?? 0) - Number(b.sort ?? 0))
      .map((category) => ({ id: Number(category.id), name: category.name }));
    if (categories.length > 0) return categories;
  } catch {
    // Fall through to the older methods.
  }
  const custom = await callBitrix<Array<{ ID: string | number; NAME: string }>>(webhookUrl, "crm.dealcategory.list").catch(
    () => [],
  );
  const fallbackDefault = await callBitrix<{ NAME?: string }>(webhookUrl, "crm.dealcategory.default.get").catch(() => null);
  return [
    { id: 0, name: fallbackDefault?.NAME ?? "" },
    ...(custom ?? []).map((category) => ({ id: Number(category.ID), name: category.NAME })),
  ];
}

// Every stage of every deal pipeline, ids as Bitrix24 expects them in STAGE_ID ("NEW", "C3:NEW"). With more than
// one pipeline each stage is named "Pipeline › Stage" so the dropdown stays unambiguous.
export async function fetchBitrixDealStages(webhookUrl: string): Promise<Array<{ id: string; name: string }>> {
  const categories = await fetchDealCategories(webhookUrl);
  const lists = await Promise.all(
    categories.map(async (category) => {
      const entityId = category.id === 0 ? "DEAL_STAGE" : `DEAL_STAGE_${category.id}`;
      const result = await callBitrix<Array<{ STATUS_ID: string; NAME: string; SORT?: string }>>(
        webhookUrl,
        "crm.status.list",
        { "filter[ENTITY_ID]": entityId },
      );
      return (result ?? [])
        .slice()
        .sort((a, b) => Number(a.SORT) - Number(b.SORT))
        .map((stage) => ({
          id: String(stage.STATUS_ID),
          name: categories.length > 1 && category.name ? `${category.name} › ${stage.NAME}` : stage.NAME,
        }));
    }),
  );
  return lists.flat();
}

// Stage list straight from crm.deal.fields' STAGE_ID options (default pipeline only). Used when crm.status.list
// is refused.
export async function fetchBitrixDealStagesFromFields(webhookUrl: string): Promise<Array<{ id: string; name: string }>> {
  const result = await callBitrix<Record<string, RawField>>(webhookUrl, "crm.deal.fields");
  return (result?.STAGE_ID?.items ?? []).map((item) => ({ id: String(item.ID), name: item.VALUE }));
}

// Lead sources (the SOURCE_ID dropdown: Facebook, Web, Call, custom ones …).
// crm.status.list is the proper list; some Bitrix24 plans refuse it, and the
// same options are in crm.lead.fields' SOURCE_ID, so that is the fallback.
export async function fetchBitrixSources(webhookUrl: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const result = await callBitrix<Array<{ STATUS_ID: string; NAME: string; SORT?: string }>>(
      webhookUrl,
      "crm.status.list",
      { "filter[ENTITY_ID]": "SOURCE" },
    );
    const sources = (result ?? [])
      .sort((a, b) => Number(a.SORT) - Number(b.SORT))
      .map((source) => ({ id: String(source.STATUS_ID), name: source.NAME }));
    if (sources.length > 0) return sources;
  } catch {
    // Fall through to crm.lead.fields.
  }
  const result = await callBitrix<Record<string, RawField>>(webhookUrl, "crm.lead.fields");
  return (result?.SOURCE_ID?.items ?? []).map((item) => ({ id: String(item.ID), name: item.VALUE }));
}

// Types a new field can be created with. These are the Bitrix24 user field
// types that a text answer from a Facebook form can sensibly be written to;
// file, employee, address, money and CRM-link fields need structured values.
export const CREATABLE_FIELD_TYPES = [
  "string",
  "integer",
  "double",
  "boolean",
  "date",
  "datetime",
  "url",
  "enumeration",
] as const;
export type CreatableFieldType = (typeof CREATABLE_FIELD_TYPES)[number];

export interface NewFieldInput {
  label: string;
  type: CreatableFieldType;
  multiple: boolean;
  options: string[]; // list items, for type "enumeration"
}

// Languages a portal's field label is stored for; Bitrix24 shows the label of
// the portal's own language, so the same text is saved for each of them.
const LABEL_LANGUAGES = ["en", "ru", "ua", "kz", "de", "tr", "pl"];

// Creates a custom lead or deal field (crm.lead.userfield.add / crm.deal.userfield.add) and returns it as the
// CRM now lists it. Needs a webhook whose owner may edit CRM settings.
export async function createBitrixField(
  webhookUrl: string,
  input: NewFieldInput,
  entity: CrmEntity = "lead",
  contactSuffix = "contact",
): Promise<CrmFieldDef> {
  // Bitrix24 prefixes the name with UF_CRM_. Names are generated, not derived
  // from the label, so any language works and two fields never collide.
  const name = `LS${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
  const label = Object.fromEntries(LABEL_LANGUAGES.map((lang) => [lang, input.label]));
  const isList = input.type === "enumeration";

  const response = await fetch(bitrixMethodUrl(webhookUrl, `crm.${entity}.userfield.add`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        FIELD_NAME: name,
        USER_TYPE_ID: input.type,
        XML_ID: `LEADSYNC_${name}`,
        EDIT_FORM_LABEL: label,
        LIST_COLUMN_LABEL: label,
        LIST_FILTER_LABEL: label,
        MULTIPLE: input.multiple && input.type !== "boolean" ? "Y" : "N",
        MANDATORY: "N",
        SHOW_FILTER: "E",
        SHOW_IN_LIST: "Y",
        ...(isList
          ? { LIST: input.options.map((value, index) => ({ VALUE: value, DEF: "N", SORT: (index + 1) * 10 })) }
          : {}),
      },
    }),
  });
  const body = (await response.json().catch(() => null)) as { result?: unknown; error?: string; error_description?: string } | null;
  if (!response.ok || !body || body.error || !body.result) {
    throw new Error(body?.error_description ?? body?.error ?? `Bitrix24 HTTP ${response.status}`);
  }

  const fieldId = `UF_CRM_${name}`;
  const created = (await fetchBitrixFields(webhookUrl, entity, contactSuffix)).find((def) => def.id === fieldId);
  if (!created) throw new Error("Maydon yaratildi, lekin ro'yxatda ko'rinmadi");
  return created;
}
