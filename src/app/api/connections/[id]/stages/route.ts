import { NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { getSessionUserId } from "@/lib/server-session";
import { toErrorResponseBody } from "@/lib/api-error";
import { fetchBitrixStagesFromFields } from "@/lib/bitrix-fields";
import { fetchAmoStages } from "@/lib/amocrm";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    const connection = await Connection.findOne({
      _id: id,
      user: userId,
      platform: { $in: ["bitrix24", "amocrm"] },
    }).select("+webhookUrl +jwtToken");

    if (!connection) {
      return localizedJson({ message: "CRM ulanishi topilmadi" }, { status: 404 });
    }

    if (connection.platform === "bitrix24") {
      const url = new URL(
        "crm.status.list",
        connection.webhookUrl!.endsWith("/") ? connection.webhookUrl! : `${connection.webhookUrl}/`,
      );
      url.searchParams.set("filter[ENTITY_ID]", "STATUS");

      const response = await fetch(url);
      const body = await response.json();

      if (!response.ok || body.error) {
        // Some Bitrix24 plans refuse crm.status.list; the same stages are
        // listed in crm.lead.fields, so try that before giving up.
        try {
          const fallback = await fetchBitrixStagesFromFields(connection.webhookUrl!);
          if (fallback.length > 0) return NextResponse.json(fallback);
        } catch {
          // Fall through to the original error.
        }
        return NextResponse.json(
          { message: body?.error_description ?? "Bosqichlar ro'yxati olinmadi" },
          { status: 502 },
        );
      }

      const stages = (body.result ?? [])
        .sort((a: { SORT: string }, b: { SORT: string }) => Number(a.SORT) - Number(b.SORT))
        .map((stage: { STATUS_ID: string; NAME: string }) => ({ id: stage.STATUS_ID, name: stage.NAME }));
      return NextResponse.json(stages);
    }

    try {
      return NextResponse.json(
        await fetchAmoStages({ accountUrl: connection.accountUrl!, token: connection.jwtToken! }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bosqichlar ro'yxati olinmadi";
      return NextResponse.json({ message }, { status: 502 });
    }
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
