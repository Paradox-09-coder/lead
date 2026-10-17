import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { processFacebookLead, type LeadgenChangeValue } from "@/lib/lead-delivery";

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

interface WebhookEntry {
  changes?: { field: string; value: LeadgenChangeValue }[];
}

interface WebhookBody {
  object?: string;
  entry?: WebhookEntry[];
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
      await processFacebookLead(change.value).catch((error) => {
        console.error("[facebook-webhook] lead processing failed", change.value?.leadgen_id, error);
      });
    }
  }

  return NextResponse.json({ ok: true });
}
