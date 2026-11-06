// Bitrix24 lead fields (standard + custom UF_CRM_*) as returned by
// crm.lead.fields, trimmed to the ones a Facebook form answer can be written to.

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
const RESERVED_IDS = new Set(["TITLE", "STATUS_ID", "SOURCE_ID", "SOURCE_DESCRIPTION"]);

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

// Every lead field an answer can be written to, standard ones first.
export async function fetchBitrixLeadFields(webhookUrl: string): Promise<CrmFieldDef[]> {
  const result = await callBitrix<Record<string, RawField>>(webhookUrl, "crm.lead.fields");
  const defs = Object.entries(result ?? {})
    .filter(([id, raw]) => !raw.isReadOnly && !RESERVED_IDS.has(id) && WRITABLE_TYPES.has(raw.type ?? "string"))
    .map(([id, raw]) => toDef(id, raw));
  return defs.sort((a, b) => Number(a.custom) - Number(b.custom) || a.label.localeCompare(b.label));
}

// Stage list straight from crm.lead.fields' STATUS_ID options. Used when
// crm.status.list is refused (some Bitrix24 plans block it).
export async function fetchBitrixStagesFromFields(webhookUrl: string): Promise<Array<{ id: string; name: string }>> {
  const result = await callBitrix<Record<string, RawField>>(webhookUrl, "crm.lead.fields");
  return (result?.STATUS_ID?.items ?? []).map((item) => ({ id: String(item.ID), name: item.VALUE }));
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

// Creates a custom lead field (crm.lead.userfield.add) and returns it as the
// CRM now lists it. Needs a webhook whose owner may edit CRM settings.
export async function createBitrixLeadField(webhookUrl: string, input: NewFieldInput): Promise<CrmFieldDef> {
  // Bitrix24 prefixes the name with UF_CRM_. Names are generated, not derived
  // from the label, so any language works and two fields never collide.
  const name = `LS${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
  const label = Object.fromEntries(LABEL_LANGUAGES.map((lang) => [lang, input.label]));
  const isList = input.type === "enumeration";

  const response = await fetch(bitrixMethodUrl(webhookUrl, "crm.lead.userfield.add"), {
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
  const created = (await fetchBitrixLeadFields(webhookUrl)).find((def) => def.id === fieldId);
  if (!created) throw new Error("Maydon yaratildi, lekin ro'yxatda ko'rinmadi");
  return created;
}
