import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  extractLeadgenEvents,
  fetchLeadData,
  verifyFacebookSignature,
  type FacebookLeadgenEvent,
} from "@/lib/facebook";
import { createBitrixLead, mapFacebookLeadToBitrix } from "@/lib/bitrix";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.FB_APP_SECRET;

  if (!appSecret || !verifyFacebookSignature(rawBody, signature, appSecret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const events = extractLeadgenEvents(payload);

  for (const event of events) {
    const existing = await prisma.syncedLead.upsert({
      where: { fbLeadgenId: event.leadgenId },
      create: {
        fbLeadgenId: event.leadgenId,
        pageId: event.pageId,
        formId: event.formId,
        adId: event.adId,
        status: "PENDING",
      },
      update: {},
    });

    // Skip redeliveries of an event we've already successfully synced.
    if (existing.status === "SUCCESS") continue;

    await processLead(event);
  }

  // Acknowledge receipt so Facebook doesn't retry the delivery.
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

async function processLead(event: FacebookLeadgenEvent) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const bitrixWebhookUrl = process.env.BITRIX_WEBHOOK_URL;
  const sourceId = process.env.BITRIX_SOURCE_ID ?? "WEBFORM";

  try {
    if (!pageAccessToken) throw new Error("FB_PAGE_ACCESS_TOKEN is not configured");
    if (!bitrixWebhookUrl) throw new Error("BITRIX_WEBHOOK_URL is not configured");

    const leadData = await fetchLeadData(event.leadgenId, pageAccessToken);
    const mappedFields = mapFacebookLeadToBitrix(leadData.fieldData, {
      pageId: event.pageId,
      formId: event.formId,
      sourceId,
    });
    const bitrixLeadId = await createBitrixLead(bitrixWebhookUrl, mappedFields);

    await prisma.syncedLead.update({
      where: { fbLeadgenId: event.leadgenId },
      data: {
        status: "SUCCESS",
        rawFieldData: leadData.fieldData as unknown as Prisma.InputJsonValue,
        mappedFields: mappedFields as unknown as Prisma.InputJsonValue,
        bitrixLeadId,
        errorMessage: null,
      },
    });
  } catch (error) {
    await prisma.syncedLead.update({
      where: { fbLeadgenId: event.leadgenId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
        retryCount: { increment: 1 },
      },
    });
  }
}
