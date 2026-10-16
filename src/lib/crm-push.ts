import type { ConnectionDocument } from "@/models/Connection";
import type { LeadUtm } from "@/models/Lead";

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
}

// Pushes a lead into Bitrix24 via crm.lead.add on the connection's inbound
// webhook. Returns the newly created lead's Bitrix24 ID.
async function pushToBitrix24(
  connection: ConnectionDocument,
  fields: LeadFields,
  stageId: string | undefined,
  meta: CrmLeadMeta,
): Promise<string> {
  const url = new URL(
    "crm.lead.add",
    connection.webhookUrl!.endsWith("/") ? connection.webhookUrl! : `${connection.webhookUrl}/`,
  );

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        TITLE: meta.title,
        NAME: fields.name,
        PHONE: fields.phone ? [{ VALUE: fields.phone, VALUE_TYPE: "WORK" }] : undefined,
        EMAIL: fields.email ? [{ VALUE: fields.email, VALUE_TYPE: "WORK" }] : undefined,
        SOURCE_ID: meta.sourceId,
        SOURCE_DESCRIPTION: meta.sourceDescription,
        STATUS_ID: stageId || undefined,
        UTM_SOURCE: meta.utm?.source,
        UTM_MEDIUM: meta.utm?.medium,
        UTM_CAMPAIGN: meta.utm?.campaign,
        UTM_CONTENT: meta.utm?.content,
        UTM_TERM: meta.utm?.term,
      },
    }),
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

export async function pushLeadToCrm(
  connection: ConnectionDocument,
  fields: LeadFields,
  stageId: string | undefined,
  meta: CrmLeadMeta,
): Promise<string> {
  if (connection.platform === "bitrix24") {
    return pushToBitrix24(connection, fields, stageId, meta);
  }
  if (connection.platform === "amocrm") {
    return pushToAmoCrm(connection, fields, stageId, meta);
  }
  throw new Error(`${connection.platform} uchun lead yuborish qo'llab-quvvatlanmaydi`);
}
