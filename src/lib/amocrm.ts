// amoCRM / Kommo REST API v4: pipelines, lead and contact fields, and turning a
// LeadSync lead into the "complex" lead request (lead + contact in one call).
import type { CrmFieldDef, NewFieldInput } from "@/lib/bitrix-fields";
import type { FieldMappingEntry, HiddenFieldEntry } from "@/models/Integration";

export interface AmoAccount {
  accountUrl: string;
  token: string;
}

interface AmoErrorBody {
  title?: string;
  detail?: string;
  "validation-errors"?: Array<{ errors?: Array<{ path?: string; detail?: string }> }>;
}

function amoErrorMessage(status: number, body: AmoErrorBody | null, fallback: string): string {
  if (status === 401) return "amoCRM tokeni noto'g'ri yoki muddati tugagan";
  const validation = body?.["validation-errors"]?.[0]?.errors?.[0];
  if (validation) return [validation.path, validation.detail].filter(Boolean).join(": ");
  return body?.detail ?? body?.title ?? fallback;
}

// A successful answer with no content (204: nothing found) comes back as null.
export async function amoRequest<T>(
  account: AmoAccount,
  path: string,
  fallbackError: string,
  payload?: unknown,
): Promise<T | null> {
  const response = await fetch(`${account.accountUrl.replace(/\/$/, "")}${path}`, {
    method: payload === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${account.token}`,
      ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  if (response.status === 204) return null;
  const body = (await response.json().catch(() => null)) as (T & AmoErrorBody) | null;
  if (!response.ok) throw new Error(amoErrorMessage(response.status, body, fallbackError));
  return body;
}

// amoCRM's own stages for a won and a lost deal, the same in every pipeline.
const CLOSED_STATUS_IDS = new Set([142, 143]);
// "Неразобранное": leads get there through the unsorted API only.
const UNSORTED_STATUS_TYPE = 1;

interface AmoPipeline {
  id: number;
  name: string;
  is_main?: boolean;
  _embedded?: { statuses?: Array<{ id: number; name: string; sort: number; type?: number }> };
}

// Every stage of every pipeline a new lead can land in. The id carries the
// pipeline too ("pipeline:status"), because amoCRM needs both for any pipeline
// other than the main one.
export async function fetchAmoStages(account: AmoAccount): Promise<Array<{ id: string; name: string }>> {
  const body = await amoRequest<{ _embedded?: { pipelines?: AmoPipeline[] } }>(
    account,
    "/api/v4/leads/pipelines",
    "Bosqichlar ro'yxati olinmadi",
  );
  const pipelines = [...(body?._embedded?.pipelines ?? [])].sort((a, b) => Number(b.is_main) - Number(a.is_main));
  return pipelines.flatMap((pipeline) =>
    [...(pipeline._embedded?.statuses ?? [])]
      .filter((status) => !CLOSED_STATUS_IDS.has(status.id) && status.type !== UNSORTED_STATUS_TYPE)
      .sort((a, b) => a.sort - b.sort)
      .map((status) => ({
        id: `${pipeline.id}:${status.id}`,
        name: pipelines.length > 1 ? `${pipeline.name} — ${status.name}` : status.name,
      })),
  );
}

interface AmoCustomField {
  id: number;
  name: string;
  type: string;
  code?: string | null;
  enums?: Array<{ id: number; value: string }> | null;
}

// amoCRM field type -> the type name the mapping code works with. Types that a
// text answer cannot be written to (files, links to other records, …) are left out.
const FIELD_TYPES: Record<string, string> = {
  text: "string",
  textarea: "string",
  streetaddress: "string",
  numeric: "double",
  checkbox: "boolean",
  select: "enumeration",
  radiobutton: "enumeration",
  multiselect: "enumeration",
  date: "date",
  birthday: "date",
  date_time: "datetime",
  url: "url",
};

async function fetchCustomFields(account: AmoAccount, entity: "leads" | "contacts"): Promise<AmoCustomField[]> {
  const fields: AmoCustomField[] = [];
  for (let page = 1; page <= 20; page++) {
    const body = await amoRequest<{
      _embedded?: { custom_fields?: AmoCustomField[] };
      _links?: { next?: unknown };
    }>(account, `/api/v4/${entity}/custom_fields?limit=250&page=${page}`, "Maydonlar ro'yxati olinmadi");
    fields.push(...(body?._embedded?.custom_fields ?? []));
    if (!body?._links?.next) break;
  }
  return fields;
}

export interface AmoFieldLabels {
  name: string;
  lastName: string;
  phone: string;
  email: string;
  position: string;
  price: string;
  contactSuffix: string;
}

const DEFAULT_LABELS: AmoFieldLabels = {
  name: "Ism",
  lastName: "Familiya",
  phone: "Telefon",
  email: "Email",
  position: "Lavozim",
  price: "Budjet",
  contactSuffix: "kontakt",
};

function standardField(id: string, label: string, type: string, multiple = false): CrmFieldDef {
  return { id, label, type, required: false, multiple, custom: false };
}

function customFieldDef(prefix: "lead" | "contact", field: AmoCustomField, suffix?: string): CrmFieldDef | null {
  const type = FIELD_TYPES[field.type];
  if (!type) return null;
  return {
    id: `${prefix}_${field.id}`,
    label: suffix ? `${field.name} (${suffix})` : field.name,
    type,
    required: false,
    multiple: field.type === "multiselect",
    custom: true,
    items: field.enums?.map((item) => ({ id: String(item.id), value: item.value })),
  };
}

// The fields a form answer can be written to. An amoCRM lead's phone and email
// live on its contact, so both records' fields are offered. The standard ones
// use the same ids as Bitrix24's, so automatic suggestions work for both CRMs.
export async function fetchAmoLeadFields(
  account: AmoAccount,
  labels: AmoFieldLabels = DEFAULT_LABELS,
): Promise<CrmFieldDef[]> {
  const [leadFields, contactFields] = await Promise.all([
    fetchCustomFields(account, "leads"),
    fetchCustomFields(account, "contacts"),
  ]);
  const standardCodes = new Set(["PHONE", "EMAIL", "POSITION", "IM"]);
  const hasPosition = contactFields.some((field) => field.code === "POSITION");

  const standard = [
    standardField("NAME", labels.name, "string"),
    standardField("LAST_NAME", labels.lastName, "string"),
    standardField("PHONE", labels.phone, "crm_multifield", true),
    standardField("EMAIL", labels.email, "crm_multifield", true),
    ...(hasPosition ? [standardField("POST", labels.position, "string")] : []),
    standardField("PRICE", labels.price, "integer"),
  ];
  const custom = [
    ...leadFields.map((field) => customFieldDef("lead", field)),
    ...contactFields
      .filter((field) => !standardCodes.has(field.code ?? ""))
      .map((field) => customFieldDef("contact", field, labels.contactSuffix)),
  ].filter((def): def is CrmFieldDef => def !== null);
  return [...standard, ...custom.sort((a, b) => a.label.localeCompare(b.label))];
}

const NEW_FIELD_TYPES: Record<NewFieldInput["type"], string> = {
  string: "text",
  integer: "numeric",
  double: "numeric",
  boolean: "checkbox",
  date: "date",
  datetime: "date_time",
  url: "url",
  enumeration: "select",
};

// Creates a custom field on amoCRM's leads and returns it as the CRM now lists
// it. amoCRM only lets account administrators do this.
export async function createAmoLeadField(
  account: AmoAccount,
  input: NewFieldInput,
  labels?: AmoFieldLabels,
): Promise<CrmFieldDef> {
  const isList = input.type === "enumeration";
  const body = await amoRequest<{ _embedded?: { custom_fields?: Array<{ id: number }> } }>(
    account,
    "/api/v4/leads/custom_fields",
    "Maydon yaratilmadi",
    [
      {
        name: input.label,
        type: isList && input.multiple ? "multiselect" : NEW_FIELD_TYPES[input.type],
        ...(isList ? { enums: input.options.map((value, index) => ({ value, sort: (index + 1) * 10 })) } : {}),
      },
    ],
  );
  const id = body?._embedded?.custom_fields?.[0]?.id;
  if (!id) throw new Error("Maydon yaratilmadi");
  const created = (await fetchAmoLeadFields(account, labels)).find((def) => def.id === `lead_${id}`);
  if (!created) throw new Error("Maydon yaratildi, lekin ro'yxatda ko'rinmadi");
  return created;
}

type AmoFieldRef = { field_id: number } | { field_code: string };

interface AmoFieldValue {
  value?: string | number | boolean;
  enum_id?: number;
  enum_code?: string;
}

interface AmoCustomValues {
  [key: string]: unknown;
  custom_fields_values?: Array<AmoFieldRef & { values: AmoFieldValue[] }>;
}

export interface AmoContactPayload extends AmoCustomValues {
  name?: string;
  first_name?: string;
  last_name?: string;
}

export interface AmoLeadPayload extends AmoCustomValues {
  price?: number;
}

export interface AmoFieldsResult {
  lead: AmoLeadPayload;
  contact: AmoContactPayload;
  // Values the field cannot take (not a date, not a link): kept for the lead's note.
  comments: string[];
}

function fieldRef(id: string): { target: "lead" | "contact"; ref: AmoFieldRef } | null {
  if (id === "PHONE" || id === "EMAIL") return { target: "contact", ref: { field_code: id } };
  if (id === "POST") return { target: "contact", ref: { field_code: "POSITION" } };
  const match = /^(lead|contact)_(\d+)$/.exec(id);
  return match ? { target: match[1] as "lead" | "contact", ref: { field_id: Number(match[2]) } } : null;
}

// One already-converted value (see buildMappedFields) in amoCRM's format, or
// null when the field cannot take it.
function toAmoValue(type: string | undefined, value: unknown): AmoFieldValue | null {
  switch (type) {
    case "crm_multifield":
      return { value: String((value as { VALUE: string }).VALUE), enum_code: "WORK" };
    case "enumeration":
      return { enum_id: Number(value) };
    case "boolean":
      return { value: value === "Y" };
    case "date":
    case "datetime": {
      const time = Date.parse(String(value));
      return Number.isNaN(time) ? null : { value: Math.floor(time / 1000) };
    }
    case "url":
      return URL.canParse(String(value)) ? { value: String(value) } : null;
    default:
      return { value: String(value) };
  }
}

// Splits the values built by buildMappedFields / buildHiddenFields (keyed by the
// ids from fetchAmoLeadFields) into what goes on amoCRM's lead and its contact.
export function toAmoFields(
  values: Record<string, unknown>,
  entries: Array<FieldMappingEntry | HiddenFieldEntry>,
): AmoFieldsResult {
  const result: AmoFieldsResult = { lead: {}, contact: {}, comments: [] };
  const entryByField = new Map(entries.map((entry) => [entry.crmField, entry]));
  const firstName = typeof values.NAME === "string" ? values.NAME : undefined;
  const lastName = typeof values.LAST_NAME === "string" ? values.LAST_NAME : undefined;

  if (lastName) {
    result.contact.first_name = firstName;
    result.contact.last_name = lastName;
  } else if (firstName) {
    result.contact.name = firstName;
  }
  if (typeof values.PRICE === "number") result.lead.price = values.PRICE;

  for (const [id, value] of Object.entries(values)) {
    const place = fieldRef(id);
    if (!place) continue;
    const entry = entryByField.get(id);
    const converted: AmoFieldValue[] = [];
    for (const item of Array.isArray(value) ? value : [value]) {
      const amoValue = toAmoValue(entry?.crmFieldType, item);
      if (amoValue) {
        converted.push(amoValue);
      } else {
        const label =
          (entry && "questionLabel" in entry ? entry.questionLabel : undefined) ??
          (entry && "crmFieldLabel" in entry ? entry.crmFieldLabel : undefined) ??
          id;
        result.comments.push(`${label}: ${String(item)}`);
      }
    }
    if (converted.length === 0) continue;
    const owner = result[place.target];
    owner.custom_fields_values = [...(owner.custom_fields_values ?? []), { ...place.ref, values: converted }];
  }
  return result;
}

// A stage saved by LeadSync is "pipeline:status"; an older one is just "status",
// which amoCRM looks up in the main pipeline.
export function parseAmoStage(stageId: string | undefined): { pipeline_id?: number; status_id?: number } {
  if (!stageId) return {};
  const [first, second] = stageId.split(":").map(Number);
  if (second !== undefined) {
    return Number.isFinite(first) && Number.isFinite(second) ? { pipeline_id: first, status_id: second } : {};
  }
  return Number.isFinite(first) ? { status_id: first } : {};
}
