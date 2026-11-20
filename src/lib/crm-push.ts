import type { ConnectionDocument } from "@/models/Connection";
import type { LeadUtm } from "@/models/Lead";
import type { FieldMappingEntry, HiddenFieldEntry } from "@/models/Integration";
import { bitrixMethodUrl } from "@/lib/bitrix-fields";
import { buildHiddenFields, buildMappedFields, type FacebookAnswer } from "@/lib/field-mapping";
import { contactFieldName, dealCategoryOfStage, isContactField, type CrmEntity } from "@/lib/crm-entity";
import { amoRequest, parseAmoStage, toAmoFields, type AmoAccount } from "@/lib/amocrm";

export interface LeadFields {
  name?: string;
  phone?: string;
  email?: string;
}

// How the lead is labelled in the CRM: card title, Bitrix24 SOURCE_ID, and
// the UTM tags it arrived with (web forms only).
export interface CrmLeadMeta {
  title: string;
  // Bitrix24 only: create a deal (with a contact) instead of a lead card. Absent = lead.
  entity?: CrmEntity;
  sourceId: string;
  sourceDescription?: string;
  utm?: LeadUtm;
  // Facebook leads only: the integration's question -> CRM field mapping and
  // the lead's raw answers. Without both, name/phone/email are sent as before.
  fieldMapping?: FieldMappingEntry[];
  answers?: FacebookAnswer[];
  // Facebook leads only: fixed values the integration writes to CRM fields on
  // every lead, whatever the form asked.
  hiddenFields?: HiddenFieldEntry[];
}

// Calls a Bitrix24 REST method on the connection's inbound webhook and returns its `result`.
async function bitrixPost<T>(connection: ConnectionDocument, method: string, payload: object, fallback: string): Promise<T> {
  const response = await fetch(bitrixMethodUrl(connection.webhookUrl!, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.error) {
    throw new Error(body?.error_description ?? body?.error ?? fallback);
  }
  return body.result as T;
}

// The fields of the card to create, before they are split between a deal and its contact: the lead's own
// common fields, the answers following the integration's mapping (or name / phone / email without one), and the
// hidden fields on top.
function buildBitrixFields(
  fields: LeadFields,
  meta: CrmLeadMeta,
  common: Record<string, unknown>,
  entity: CrmEntity,
): Record<string, unknown> {
  let built: Record<string, unknown>;
  if (meta.fieldMapping && meta.answers && meta.answers.length > 0) {
    // The integration says which question goes to which Bitrix24 field.
    const mapped = buildMappedFields(meta.fieldMapping, meta.answers);
    const comments = [mapped.fields.COMMENTS, ...mapped.comments].filter(Boolean).join("\n");
    built = { ...common, ...mapped.fields, COMMENTS: comments || undefined };
  } else {
    // A deal keeps name / phone / email on its contact.
    const prefix = entity === "deal" ? "CONTACT." : "";
    built = {
      ...common,
      [`${prefix}NAME`]: fields.name,
      [`${prefix}PHONE`]: fields.phone ? [{ VALUE: fields.phone, VALUE_TYPE: "WORK" }] : undefined,
      [`${prefix}EMAIL`]: fields.email ? [{ VALUE: fields.email, VALUE_TYPE: "WORK" }] : undefined,
    };
  }

  if (meta.hiddenFields && meta.hiddenFields.length > 0) {
    // A hidden field is the user's explicit choice, so it wins over the same
    // field filled from an answer. Lists (phones, emails, multiple-value
    // fields) are added to, and the comment is appended to, not replaced.
    const hidden = buildHiddenFields(meta.hiddenFields);
    const comments = [built.COMMENTS];
    for (const [field, value] of Object.entries(hidden.fields)) {
      if (field === "COMMENTS") {
        comments.push(value);
        continue;
      }
      const existing = built[field];
      built[field] = Array.isArray(existing) && Array.isArray(value) ? [...existing, ...value] : value;
    }
    const comment = [...comments, ...hidden.comments].filter(Boolean).join("\n");
    built.COMMENTS = comment || undefined;
  }
  return built;
}

// Pushes a lead into Bitrix24 via crm.lead.add on the connection's inbound
// webhook. Returns the newly created lead's Bitrix24 ID.
async function pushToBitrix24Lead(
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
  const leadFields = buildBitrixFields(fields, meta, common, "lead");
  const result = await bitrixPost<number>(connection, "crm.lead.add", { fields: leadFields }, "Bitrix24'ga lead yuborilmadi");
  return String(result);
}

// Pushes a lead into Bitrix24 as a deal: the person becomes a contact (crm.contact.add, or an existing contact
// with the same phone / email when `contactId` is given) and the deal (crm.deal.add) is attached to it. Answers
// mapped to a "CONTACT." field go to the contact, the rest to the deal. Returns the new deal's ID.
async function pushToBitrix24Deal(
  connection: ConnectionDocument,
  fields: LeadFields,
  stageId: string | undefined,
  meta: CrmLeadMeta,
  contactId?: string,
): Promise<string> {
  const common = {
    TITLE: meta.title,
    SOURCE_ID: meta.sourceId,
    SOURCE_DESCRIPTION: meta.sourceDescription,
    UTM_SOURCE: meta.utm?.source,
    UTM_MEDIUM: meta.utm?.medium,
    UTM_CAMPAIGN: meta.utm?.campaign,
    UTM_CONTENT: meta.utm?.content,
    UTM_TERM: meta.utm?.term,
  };
  const all = buildBitrixFields(fields, meta, common, "deal");

  const dealFields: Record<string, unknown> = {};
  const contactFields: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(all)) {
    if (value === undefined) continue;
    if (isContactField(field)) contactFields[contactFieldName(field)] = value;
    else dealFields[field] = value;
  }
  // The name may come from a field of the form that is not mapped to the contact's name.
  if (!contactFields.NAME && fields.name) contactFields.NAME = fields.name;

  let contact = contactId;
  if (!contact && Object.keys(contactFields).length > 0) {
    contact = String(
      await bitrixPost<number>(
        connection,
        "crm.contact.add",
        { fields: { ...contactFields, SOURCE_ID: meta.sourceId } },
        "Bitrix24'da kontakt yaratilmadi",
      ),
    );
  }

  const deal = {
    ...dealFields,
    ...(stageId ? { STAGE_ID: stageId, CATEGORY_ID: dealCategoryOfStage(stageId) } : {}),
    ...(contact ? { CONTACT_ID: Number(contact) } : {}),
  };
  const result = await bitrixPost<number>(
    connection,
    "crm.deal.add",
    { fields: deal, params: { REGISTER_SONET_EVENT: "Y" } },
    "Bitrix24'ga sdelka yuborilmadi",
  );
  return String(result);
}

function amoAccount(connection: ConnectionDocument): AmoAccount {
  return { accountUrl: connection.accountUrl!, token: connection.jwtToken! };
}

// The values for amoCRM's fields and the lines for the lead's note. Without a
// mapping the contact gets name/phone/email and every other answer goes to the note.
function amoLeadValues(fields: LeadFields, meta: CrmLeadMeta) {
  const hasMapping = Boolean(meta.fieldMapping && meta.fieldMapping.length > 0 && meta.answers?.length);
  const values: Record<string, unknown> = {};
  const comments: string[] = [];

  if (hasMapping) {
    const mapped = buildMappedFields(meta.fieldMapping!, meta.answers!);
    Object.assign(values, mapped.fields);
    comments.push(...mapped.comments);
  } else {
    if (fields.phone) values.PHONE = [{ VALUE: fields.phone }];
    if (fields.email) values.EMAIL = [{ VALUE: fields.email }];
    const sent = new Set([fields.name, fields.phone, fields.email]);
    for (const answer of meta.answers ?? []) {
      const value = (answer.values ?? []).filter(Boolean).join(", ");
      if (value && !sent.has(value)) comments.push(`${answer.name}: ${value}`);
    }
  }

  if (meta.hiddenFields && meta.hiddenFields.length > 0) {
    const hidden = buildHiddenFields(meta.hiddenFields);
    comments.push(...hidden.comments);
    for (const [field, value] of Object.entries(hidden.fields)) {
      const existing = values[field];
      values[field] = Array.isArray(existing) && Array.isArray(value) ? [...existing, ...value] : value;
    }
  }
  return { values, comments };
}

// Pushes a lead into amoCRM/Kommo via POST /api/v4/leads/complex, the endpoint
// that creates a lead together with a new contact (POST /api/v4/leads can only
// attach an existing one). Answers without a field go into a note on the lead.
async function pushToAmoCrm(
  connection: ConnectionDocument,
  fields: LeadFields,
  stageId: string | undefined,
  meta: CrmLeadMeta,
): Promise<string> {
  const account = amoAccount(connection);
  const { values, comments } = amoLeadValues(fields, meta);
  const amo = toAmoFields(values, [
    ...(meta.fieldMapping ?? []),
    ...(meta.hiddenFields ?? []),
    { crmField: "PHONE", value: "", crmFieldType: "crm_multifield" },
    { crmField: "EMAIL", value: "", crmFieldType: "crm_multifield" },
  ]);

  const contact = { ...amo.contact };
  if (!contact.name && !contact.first_name && fields.name) contact.name = fields.name;

  const body = await amoRequest<Array<{ id?: number }>>(
    account,
    "/api/v4/leads/complex",
    "amoCRM/Kommo'ga lead yuborilmadi",
    [
      {
        name: meta.title,
        ...parseAmoStage(stageId),
        ...amo.lead,
        ...(Object.keys(contact).length > 0 ? { _embedded: { contacts: [contact] } } : {}),
      },
    ],
  );
  const id = body?.[0]?.id;
  if (!id) throw new Error("amoCRM/Kommo'ga lead yuborilmadi");

  const note = [meta.sourceDescription, ...comments, ...amo.comments].filter(Boolean).join("\n");
  if (note) {
    // The lead already exists: a failed note must not mark it as undelivered.
    await amoRequest(account, `/api/v4/leads/${id}/notes`, "Izoh qo'shilmadi", [
      { note_type: "common", params: { text: note } },
    ]).catch((error) => console.warn("[amocrm] note was not added to lead", id, error));
  }
  return String(id);
}

// The phone / email checks shared by every duplicate search.
function commChecks(fields: LeadFields): Array<["PHONE" | "EMAIL", string]> {
  const checks: Array<["PHONE" | "EMAIL", string | undefined]> = [
    ["PHONE", fields.phone],
    ["EMAIL", fields.email],
  ];
  return checks.filter((check): check is ["PHONE" | "EMAIL", string] => Boolean(check[1]));
}

// Bitrix24 ids (leads or contacts) that have the given phone / email, per crm.duplicate.findbycomm.
async function findByComm(
  connection: ConnectionDocument,
  entityType: "LEAD" | "CONTACT",
  type: "PHONE" | "EMAIL",
  value: string,
): Promise<number[]> {
  const response = await fetch(bitrixMethodUrl(connection.webhookUrl!, "crm.duplicate.findbycomm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity_type: entityType, type, values: [value] }),
  });
  const body = (await response.json().catch(() => null)) as { result?: Record<string, number[]> } | null;
  const ids = body?.result?.[entityType];
  return Array.isArray(ids) ? ids : [];
}

// Looks for an existing Bitrix24 lead with the same phone (or email).
async function findBitrix24Duplicate(connection: ConnectionDocument, fields: LeadFields): Promise<string | null> {
  for (const [type, value] of commChecks(fields)) {
    const ids = await findByComm(connection, "LEAD", type, value);
    if (ids.length > 0) return String(Math.max(...ids));
  }
  return null;
}

// Looks for an existing Bitrix24 contact with the same phone (or email) and, among its deals, an open one in the
// pipeline the new deal would land in. A returning customer whose earlier deals are all closed gets a new deal,
// attached to the contact they already have.
async function findBitrix24DealDuplicate(
  connection: ConnectionDocument,
  fields: LeadFields,
  stageId: string | undefined,
): Promise<{ dealId?: string; contactId?: string }> {
  const contactIds = new Set<number>();
  for (const [type, value] of commChecks(fields)) {
    for (const id of await findByComm(connection, "CONTACT", type, value)) contactIds.add(id);
  }
  if (contactIds.size === 0) return {};

  const deals = await bitrixPost<Array<{ ID: string }>>(
    connection,
    "crm.deal.list",
    {
      filter: { CONTACT_ID: [...contactIds], CLOSED: "N", CATEGORY_ID: dealCategoryOfStage(stageId) },
      select: ["ID"],
      order: { ID: "DESC" },
    },
    "Bitrix24 sdelkalarini qidirib bo'lmadi",
  );
  const dealId = deals?.[0]?.ID;
  return { dealId: dealId ? String(dealId) : undefined, contactId: String(Math.max(...contactIds)) };
}

// Looks for an existing amoCRM/Kommo lead through a contact with the same phone
// (or email): a lead's own search does not look at its contact's fields.
async function findAmoCrmDuplicate(connection: ConnectionDocument, fields: LeadFields): Promise<string | null> {
  const account = amoAccount(connection);
  for (const value of [fields.phone, fields.email]) {
    if (!value) continue;
    const body = await amoRequest<{ _embedded?: { contacts?: Array<{ _embedded?: { leads?: { id: number }[] } }> } }>(
      account,
      `/api/v4/contacts?query=${encodeURIComponent(value)}&with=leads&limit=1`,
      "amoCRM qidiruvi ishlamadi",
    );
    const id = body?._embedded?.contacts?.[0]?._embedded?.leads?.[0]?.id;
    if (id) return String(id);
  }
  return null;
}

export interface CrmPushResult {
  id: string;
  // What `id` is in the CRM: a lead card or a deal.
  entity: CrmEntity;
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
    if (meta.entity === "deal") {
      let contactId: string | undefined;
      if (options.duplicateCheck) {
        const found = await findBitrix24DealDuplicate(connection, fields, stageId).catch(() => ({}) as { dealId?: string; contactId?: string });
        if (found.dealId) return { id: found.dealId, duplicate: true, entity: "deal" };
        contactId = found.contactId;
      }
      return { id: await pushToBitrix24Deal(connection, fields, stageId, meta, contactId), duplicate: false, entity: "deal" };
    }
    if (options.duplicateCheck) {
      const existing = await findBitrix24Duplicate(connection, fields).catch(() => null);
      if (existing) return { id: existing, duplicate: true, entity: "lead" };
    }
    return { id: await pushToBitrix24Lead(connection, fields, stageId, meta), duplicate: false, entity: "lead" };
  }
  if (connection.platform === "amocrm") {
    if (options.duplicateCheck) {
      const existing = await findAmoCrmDuplicate(connection, fields).catch(() => null);
      if (existing) return { id: existing, duplicate: true, entity: "lead" };
    }
    return { id: await pushToAmoCrm(connection, fields, stageId, meta), duplicate: false, entity: "lead" };
  }
  throw new Error(`${connection.platform} uchun lead yuborish qo'llab-quvvatlanmaydi`);
}
