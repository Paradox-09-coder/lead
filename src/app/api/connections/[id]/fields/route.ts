import { NextRequest, NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { getSessionUserId } from "@/lib/server-session";
import {
  CREATABLE_FIELD_TYPES,
  createBitrixLeadField,
  fetchBitrixLeadFields,
  type CreatableFieldType,
} from "@/lib/bitrix-fields";
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

const MAX_LABEL = 100;
const MAX_OPTIONS = 50;

// POST /api/connections/<id>/fields — creates a new custom lead field in the
// CRM so a form question can be sent to it. Returns the new field.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      label?: unknown;
      type?: unknown;
      multiple?: unknown;
      options?: unknown;
    } | null;

    const label = typeof body?.label === "string" ? body.label.trim().slice(0, MAX_LABEL) : "";
    if (!label) return localizedJson({ message: "Maydon nomini kiriting" }, { status: 400 });

    const type = body?.type as CreatableFieldType;
    if (!(CREATABLE_FIELD_TYPES as readonly string[]).includes(type)) {
      return localizedJson({ message: "Maydon turi noto'g'ri" }, { status: 400 });
    }

    let options: string[] = [];
    if (type === "enumeration") {
      const raw = Array.isArray(body?.options) ? body.options : [];
      options = [
        ...new Set(
          raw
            .filter((option): option is string => typeof option === "string")
            .map((option) => option.trim().slice(0, MAX_LABEL))
            .filter(Boolean),
        ),
      ].slice(0, MAX_OPTIONS);
      if (options.length === 0) {
        return localizedJson({ message: "Ro'yxat uchun kamida bitta variant kiriting" }, { status: 400 });
      }
    }

    await connectDB();
    const connection = await Connection.findOne({ _id: id, user: userId, platform: "bitrix24" }).select(
      "+webhookUrl",
    );
    if (!connection?.webhookUrl) {
      return localizedJson({ message: "CRM ulanishi topilmadi" }, { status: 404 });
    }

    try {
      const field = await createBitrixLeadField(connection.webhookUrl, {
        label,
        type,
        multiple: body?.multiple === true,
        options,
      });
      return NextResponse.json(field, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Maydon yaratilmadi";
      return NextResponse.json({ message }, { status: 502 });
    }
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
