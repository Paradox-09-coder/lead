import { NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { getSessionUserId } from "@/lib/server-session";
import { fetchBitrixLeadFields } from "@/lib/bitrix-fields";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

// GET /api/connections/<id>/fields — the CRM lead fields (standard and custom)
// that a Facebook form question can be mapped to. Bitrix24 only for now.
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
      return NextResponse.json(await fetchBitrixLeadFields(connection.webhookUrl));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Maydonlar ro'yxati olinmadi";
      return NextResponse.json({ message }, { status: 502 });
    }
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
