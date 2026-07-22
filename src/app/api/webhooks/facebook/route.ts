import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { Integration } from "@/models/Integration";
import { DeliveredLead } from "@/models/DeliveredLead";
import { pushLeadToCrm, type LeadFields } from "@/lib/crm-push";
import { FACEBOOK_GRAPH_VERSION } from "@/lib/facebook-oauth";

export const runtime = "nodejs";

// Meta's webhook verification handshake (done once, when the callback URL is
// registered in the App Dashboard): echo hub.challenge back if hub.verify_token
// matches what we configured there.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.FB_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

interface LeadgenChangeValue {
  form_id: string;
  leadgen_id: string;
  page_id: string;
}

interface WebhookEntry {
  changes?: { field: string; value: LeadgenChangeValue }[];
}

interface WebhookBody {
  object?: string;
  entry?: WebhookEntry[];
}

interface FacebookFieldDatum {
  name: string;
  values?: string[];
}

function extractFields(fieldData: FacebookFieldDatum[]): LeadFields {
  const fields: LeadFields = {};
  for (const item of fieldData) {
    const key = item.name.toLowerCase();
    const value = item.values?.[0];
    if (!value) continue;
    if (key.includes("name")) fields.name = value;
    else if (key.includes("email")) fields.email = value;
    else if (key.includes("phone")) fields.phone = value;
  }
  return fields;
}

async function deliverLead(value: LeadgenChangeValue): Promise<void> {
  const alreadyDelivered = await DeliveredLead.findOne({ leadgenId: value.leadgen_id });
  if (alreadyDelivered) return;

  const integration = await Integration.findOne({
    pageId: value.page_id,
    formId: value.form_id,
    status: "active",
  });
  if (!integration) return;

  const [facebookConnection, targetConnection] = await Promise.all([
    Connection.findById(integration.facebookConnection).select("+pageAccessToken"),
    Connection.findById(integration.targetConnection).select("+webhookUrl +jwtToken"),
  ]);
  if (!facebookConnection || !targetConnection) return;

  const leadUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${value.leadgen_id}`);
  leadUrl.searchParams.set("access_token", facebookConnection.pageAccessToken!);
  const leadResponse = await fetch(leadUrl);
  const leadBody = await leadResponse.json();
  if (!leadResponse.ok) return;

  const fields = extractFields(leadBody.field_data ?? []);

  let crmLeadId: string | undefined;
  try {
    crmLeadId = await pushLeadToCrm(targetConnection, fields, integration.stageId);
  } catch {
    // Don't record a DeliveredLead on failure, so a resend can still be delivered.
    return;
  }

  await DeliveredLead.create({ leadgenId: value.leadgen_id, integration: integration._id, crmLeadId });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const appSecret = process.env.FB_APP_SECRET;
  const signatureHeader = request.headers.get("x-hub-signature-256");
  if (appSecret && signatureHeader) {
    const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
    const valid =
      expected.length === signatureHeader.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (body.object !== "page") {
    return NextResponse.json({ ok: true });
  }

  await connectDB();

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      // Swallow per-lead failures so one bad entry can't affect others, and
      // so Facebook doesn't retry-storm on an application-side error.
      await deliverLead(change.value).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
