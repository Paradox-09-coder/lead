import crypto from "node:crypto";

const GRAPH_API_VERSION = "v25.0";

export interface FacebookLeadgenEvent {
  leadgenId: string;
  pageId: string;
  formId: string;
  adId: string | null;
}

export interface FacebookFieldDatum {
  name: string;
  values: string[];
}

export interface FacebookLeadData {
  id: string;
  createdTime: string;
  formId: string;
  adId: string | null;
  fieldData: FacebookFieldDatum[];
}

/**
 * Verifies the `X-Hub-Signature-256` header Meta attaches to every webhook
 * POST. Must run against the raw, unparsed request body — the signature
 * won't match once the body has been re-serialized from a parsed object.
 */
export function verifyFacebookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader) return false;
  const [scheme, signature] = signatureHeader.split("=");
  if (scheme !== "sha256" || !signature) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

interface WebhookEntry {
  id: string;
  changes?: Array<{
    field: string;
    value: {
      leadgen_id: string;
      page_id: string;
      form_id: string;
      ad_id?: string;
    };
  }>;
}

/** Extracts every `leadgen` change from a parsed Facebook webhook payload. */
export function extractLeadgenEvents(payload: unknown): FacebookLeadgenEvent[] {
  const events: FacebookLeadgenEvent[] = [];
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("entry" in payload) ||
    !Array.isArray((payload as { entry: unknown }).entry)
  ) {
    return events;
  }

  const entries = (payload as { entry: WebhookEntry[] }).entry;
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const { leadgen_id, page_id, form_id, ad_id } = change.value;
      if (!leadgen_id || !page_id || !form_id) continue;
      events.push({
        leadgenId: leadgen_id,
        pageId: page_id,
        formId: form_id,
        adId: ad_id ?? null,
      });
    }
  }
  return events;
}

/** Fetches the full submitted answers for a lead via the Graph API. */
export async function fetchLeadData(
  leadgenId: string,
  pageAccessToken: string,
): Promise<FacebookLeadData> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}`);
  url.searchParams.set("fields", "field_data,created_time,form_id,ad_id");
  url.searchParams.set("access_token", pageAccessToken);

  const response = await fetch(url, { method: "GET" });
  const body = (await response.json()) as
    | {
        id: string;
        created_time: string;
        form_id: string;
        ad_id?: string;
        field_data: FacebookFieldDatum[];
      }
    | { error: { message: string; type: string; code: number } };

  if (!response.ok || "error" in body) {
    const message = "error" in body ? body.error.message : `HTTP ${response.status}`;
    throw new Error(`Facebook Graph API error: ${message}`);
  }

  return {
    id: body.id,
    createdTime: body.created_time,
    formId: body.form_id,
    adId: body.ad_id ?? null,
    fieldData: body.field_data ?? [],
  };
}
