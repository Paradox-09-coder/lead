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
