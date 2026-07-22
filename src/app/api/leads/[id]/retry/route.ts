import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { fetchLeadData } from "@/lib/facebook";
import { createBitrixLead, mapFacebookLeadToBitrix } from "@/lib/bitrix";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await prisma.syncedLead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead topilmadi" }, { status: 404 });
  }

  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const bitrixWebhookUrl = process.env.BITRIX_WEBHOOK_URL;
  const sourceId = process.env.BITRIX_SOURCE_ID ?? "WEBFORM";

  try {
    if (!pageAccessToken) throw new Error("FB_PAGE_ACCESS_TOKEN is not configured");
    if (!bitrixWebhookUrl) throw new Error("BITRIX_WEBHOOK_URL is not configured");

    const leadData = await fetchLeadData(lead.fbLeadgenId, pageAccessToken);
    const mappedFields = mapFacebookLeadToBitrix(leadData.fieldData, {
      pageId: lead.pageId,
      formId: lead.formId,
      sourceId,
    });
    const bitrixLeadId = await createBitrixLead(bitrixWebhookUrl, mappedFields);

    const updated = await prisma.syncedLead.update({
      where: { id },
      data: {
        status: "SUCCESS",
        rawFieldData: leadData.fieldData as unknown as Prisma.InputJsonValue,
        mappedFields: mappedFields as unknown as Prisma.InputJsonValue,
        bitrixLeadId,
        errorMessage: null,
        retryCount: { increment: 1 },
      },
    });
    return NextResponse.json({ ok: true, lead: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const updated = await prisma.syncedLead.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage: message,
        retryCount: { increment: 1 },
      },
    });
    return NextResponse.json({ ok: false, lead: updated, error: message }, { status: 502 });
  }
}
