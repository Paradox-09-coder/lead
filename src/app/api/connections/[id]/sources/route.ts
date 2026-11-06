import { NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { getSessionUserId } from "@/lib/server-session";
import { fetchBitrixSources } from "@/lib/bitrix-fields";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

// GET /api/connections/<id>/sources — the CRM's lead sources (Bitrix24's
// SOURCE_ID list), so an integration can choose which source its leads get.
// Bitrix24 only.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    const connection = await Connection.findOne({ _id: id, user: userId, platform: "bitrix24" }).select(
      "+webhookUrl",
    );
    if (!connection?.webhookUrl) {
      return localizedJson({ message: "CRM ulanishi topilmadi" }, { status: 404 });
    }

    try {
      return NextResponse.json(await fetchBitrixSources(connection.webhookUrl));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Istochniklar ro'yxati olinmadi";
      return NextResponse.json({ message }, { status: 502 });
    }
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
