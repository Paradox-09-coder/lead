import type { FacebookFieldDatum } from "@/lib/facebook";

/** Known Facebook Lead Ads field names mapped to how we use them. */
const NAME_KEYS = ["full_name"];
const FIRST_NAME_KEYS = ["first_name"];
const LAST_NAME_KEYS = ["last_name"];
const EMAIL_KEYS = ["email"];
const PHONE_KEYS = ["phone_number"];

function findValue(fieldData: FacebookFieldDatum[], keys: string[]): string | undefined {
  for (const key of keys) {
    const field = fieldData.find((f) => f.name === key);
    if (field?.values?.[0]) return field.values[0];
  }
  return undefined;
}

export interface BitrixLeadFields {
  TITLE: string;
  NAME?: string;
  LAST_NAME?: string;
  SOURCE_ID: string;
  SOURCE_DESCRIPTION: string;
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: "WORK" }>;
  EMAIL?: Array<{ VALUE: string; VALUE_TYPE: "WORK" }>;
  COMMENTS?: string;
}

/** Maps raw Facebook lead field_data into a Bitrix24 crm.lead.add fields object. */
export function mapFacebookLeadToBitrix(
  fieldData: FacebookFieldDatum[],
  context: { pageId: string; formId: string; sourceId: string },
): BitrixLeadFields {
  const fullName = findValue(fieldData, NAME_KEYS);
  const firstName = findValue(fieldData, FIRST_NAME_KEYS);
  const lastName = findValue(fieldData, LAST_NAME_KEYS);
  const email = findValue(fieldData, EMAIL_KEYS);
  const phone = findValue(fieldData, PHONE_KEYS);

  const name = firstName ?? fullName;
  const combinedName = [firstName, lastName].filter(Boolean).join(" ");
  const displayName = fullName ?? (combinedName || "Facebook Lead");

  const knownKeys = new Set([
    ...NAME_KEYS,
    ...FIRST_NAME_KEYS,
    ...LAST_NAME_KEYS,
    ...EMAIL_KEYS,
    ...PHONE_KEYS,
  ]);
  const extraFields = fieldData.filter((f) => !knownKeys.has(f.name));
  const commentsParts = [`Facebook Form: ${context.formId}, Page: ${context.pageId}`];
  if (extraFields.length > 0) {
    commentsParts.push(
      "Other answers:\n" + extraFields.map((f) => `${f.name}: ${f.values.join(", ")}`).join("\n"),
    );
  }

  return {
    TITLE: `Facebook Lead: ${displayName}`,
    NAME: name,
    LAST_NAME: lastName,
    SOURCE_ID: context.sourceId,
    SOURCE_DESCRIPTION: `Form: ${context.formId}, Page: ${context.pageId}`,
    PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: "WORK" }] : undefined,
    EMAIL: email ? [{ VALUE: email, VALUE_TYPE: "WORK" }] : undefined,
    COMMENTS: commentsParts.join("\n\n"),
  };
}

/** Posts a new lead to Bitrix24 via an inbound webhook. Returns the new lead ID. */
export async function createBitrixLead(
  webhookUrl: string,
  fields: BitrixLeadFields,
): Promise<string> {
  const url = new URL("crm.lead.add.json", webhookUrl.endsWith("/") ? webhookUrl : `${webhookUrl}/`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields, params: { REGISTER_SONET_EVENT: "Y" } }),
  });

  const body = (await response.json()) as
    | { result: number }
    | { error: string; error_description?: string };

  if (!response.ok || "error" in body) {
    const message = "error" in body ? (body.error_description ?? body.error) : `HTTP ${response.status}`;
    throw new Error(`Bitrix24 error: ${message}`);
  }

  return String(body.result);
}
