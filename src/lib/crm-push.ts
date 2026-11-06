import type { ConnectionDocument } from "@/models/Connection";
import type { LeadUtm } from "@/models/Lead";
import type { FieldMappingEntry, HiddenFieldEntry } from "@/models/Integration";
import { bitrixMethodUrl } from "@/lib/bitrix-fields";
import { buildHiddenFields, buildMappedFields, type FacebookAnswer } from "@/lib/field-mapping";

export interface LeadFields {
  name?: string;
  phone?: string;
  email?: string;
}

// How the lead is labelled in the CRM: card title, Bitrix24 SOURCE_ID, and
// the UTM tags it arrived with (web forms only).
export interface CrmLeadMeta {
  title: string;
  sourceId: string;
  sourceDescription?: string;
  utm?: LeadUtm;
  // Facebook leads only: the integration's question -> CRM field mapping and
  // the lead's raw answers. Without both, name/phone/email are sent as before.
  fieldMapping?: FieldMappingEntry[];
  answers?: FacebookAnswer[];
  // Facebook leads only: fixed values the integration writes to CRM fields on
  // every lead, whatever the form asked (Bitrix24 only).
  hiddenFields?: HiddenFieldEntry[];
}

// Pushes a lead into Bitrix24 via crm.lead.add on the connection's inbound
// webhook. Returns the newly created lead's Bitrix24 ID.
async function pushToBitrix24(
  connection: ConnectionDocument,
  fields: LeadFields,
  stageId: string | undefined,
  meta: CrmLeadMeta,
): Promise<string> {
  const common = {
    TITLE: meta.title,
    SOURCE_ID: meta.sourceId,
    SOURCE_DESCRIPTION: meta.sourceDescription,
    STATUS_ID: stageId || undefined,
    UTM_SOURCE: meta.utm?.source,
    UTM_MEDIUM: meta.utm?.medium,
    UTM_CAMPAIGN: meta.utm?.campaign,
    UTM_CONTENT: meta.utm?.content,
    UTM_TERM: meta.utm?.term,
  };

  let leadFields: Record<string, unknown>;
  if (meta.fieldMapping && meta.answers && meta.answers.length > 0) {
    // The integration says which question goes to which Bitrix24 field.
    const mapped = buildMappedFields(meta.fieldMapping, meta.answers);
    const comments = [mapped.fields.COMMENTS, ...mapped.comments].filter(Boolean).join("\n");
    leadFields = { ...common, ...mapped.fields, COMMENTS: comments || undefined };
  } else {
    leadFields = {
      ...common,
      NAME: fields.name,
      PHONE: fields.phone ? [{ VALUE: fields.phone, VALUE_TYPE: "WORK" }] : undefined,
      EMAIL: fields.email ? [{ VALUE: fields.email, VALUE_TYPE: "WORK" }] : undefined,
    };
  }

  if (meta.hiddenFields && meta.hiddenFields.length > 0) {
    // A hidden field is the user's explicit choice, so it wins over the same
    // field filled from an answer. Lists (phones, emails, multiple-value
    // fields) are added to, and the comment is appended to, not replaced.
    const hidden = buildHiddenFields(meta.hiddenFields);
    const comments = [leadFields.COMMENTS];
    for (const [field, value] of Object.entries(hidden.fields)) {
      if (field === "COMMENTS") {
        comments.push(value);
        continue;
      }
      const existing = leadFields[field];
      leadFields[field] = Array.isArray(existing) && Array.isArray(value) ? [...existing, ...value] : value;
    }
    const comment = [...comments, ...hidden.comments].filter(Boolean).join("\n");
    leadFields.COMMENTS = comment || undefined;
  }

  const response = await fetch(bitrixMethodUrl(connection.webhookUrl!, "crm.lead.add"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: leadFields }),
  });

  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body?.error_description ?? "Bitrix24'ga lead yuborilmadi");
  }

  return String(body.result);
}

// Pushes a lead into amoCRM/Kommo via POST /api/v4/leads, with an embedded
// contact carrying the phone/email so it shows up on the lead card.
async function pushToAmoCrm(
  connection: ConnectionDocument,
  fields: LeadFields,
  stageId: string | undefined,
  meta: CrmLeadMeta,
): Promise<string> {
  const base = connection.accountUrl!.replace(/\/$/, "");

  const customFields = [];
  if (fields.phone) {
    customFields.push({ field_code: "PHONE", values: [{ value: fields.phone }] });
  }
  if (fields.email) {
    customFields.push({ field_code: "EMAIL", values: [{ value: fields.email }] });
  }

  const response = await fetch(`${base}/api/v4/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${connection.jwtToken}`,
    },
    body: JSON.stringify([
      {
        name: meta.title,
        status_id: stageId ? Number(stageId) : undefined,
        _embedded: {
          contacts: [
            {
              name: fields.name,
              custom_fields_values: customFields.length > 0 ? customFields : undefined,
            },
          ],
        },
      },
    ]),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.title ?? "amoCRM/Kommo'ga lead yuborilmadi");
  }

  return String(body._embedded?.leads?.[0]?.id ?? "");
}

// Looks for an existing Bitrix24 lead with the same phone (or email).
async function findBitrix24Duplicate(connection: ConnectionDocument, fields: LeadFields): Promise<string | null> {
  const checks: Array<["PHONE" | "EMAIL", string | undefined]> = [
    ["PHONE", fields.phone],
    ["EMAIL", fields.email],
  ];
  for (const [type, value] of checks) {
    if (!value) continue;
    const response = await fetch(bitrixMethodUrl(connection.webhookUrl!, "crm.duplicate.findbycomm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: "LEAD", type, values: [value] }),
    });
    const body = (await response.json().catch(() => null)) as { result?: { LEAD?: number[] } } | null;
    const ids = body?.result?.LEAD;
    if (Array.isArray(ids) && ids.length > 0) return String(Math.max(...ids));
  }
  return null;
}

// Looks for an existing amoCRM/Kommo lead whose contact has the same phone (or email).
async function findAmoCrmDuplicate(connection: ConnectionDocument, fields: LeadFields): Promise<string | null> {
  const base = connection.accountUrl!.replace(/\/$/, "");
  for (const value of [fields.phone, fields.email]) {
    if (!value) continue;
    const url = new URL(`${base}/api/v4/leads`);
    url.searchParams.set("query", value);
    url.searchParams.set("limit", "1");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${connection.jwtToken}` } });
    if (response.status !== 200) continue; // 204 = nothing found
    const body = (await response.json().catch(() => null)) as { _embedded?: { leads?: { id: number }[] } } | null;
    const id = body?._embedded?.leads?.[0]?.id;
    if (id) return String(id);
  }
  return null;
}

export interface CrmPushResult {
  id: string;
  // The CRM already had this lead, so nothing new was created.
  duplicate: boolean;
}

export async function pushLeadToCrm(
  connection: ConnectionDocument,
  fields: LeadFields,
  stageId: string | undefined,
  meta: CrmLeadMeta,
  options: { duplicateCheck?: boolean } = {},
): Promise<CrmPushResult> {
  if (connection.platform === "bitrix24") {
    if (options.duplicateCheck) {
      const existing = await findBitrix24Duplicate(connection, fields).catch(() => null);
      if (existing) return { id: existing, duplicate: true };
    }
    return { id: await pushToBitrix24(connection, fields, stageId, meta), duplicate: false };
  }
  if (connection.platform === "amocrm") {
    if (options.duplicateCheck) {
      const existing = await findAmoCrmDuplicate(connection, fields).catch(() => null);
      if (existing) return { id: existing, duplicate: true };
    }
    return { id: await pushToAmoCrm(connection, fields, stageId, meta), duplicate: false };
  }
  throw new Error(`${connection.platform} uchun lead yuborish qo'llab-quvvatlanmaydi`);
}
