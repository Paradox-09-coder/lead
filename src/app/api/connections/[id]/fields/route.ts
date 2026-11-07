import { NextRequest, NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { getSessionUserId } from "@/lib/server-session";
import { CREATABLE_FIELD_TYPES, createBitrixLeadField, type CreatableFieldType } from "@/lib/bitrix-fields";
import { createAmoLeadField, type AmoFieldLabels } from "@/lib/amocrm";
import { loadCrmFields } from "@/lib/field-mapping";
import { getT } from "@/i18n/server";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

const CRM_PLATFORMS = { $in: ["bitrix24", "amocrm"] as Array<"bitrix24" | "amocrm"> };

// amoCRM has no field list for these standard fields, so their names are ours.
async function amoLabels(): Promise<AmoFieldLabels> {
  const { t } = await getT();
  return {
    name: t("integrationsPage.amoName"),
    lastName: t("integrationsPage.amoLastName"),
    phone: t("integrationsPage.amoPhone"),
    email: t("integrationsPage.amoEmail"),
    position: t("integrationsPage.amoPosition"),
    price: t("integrationsPage.amoPrice"),
    contactSuffix: t("integrationsPage.amoContact"),
  };
}

// GET /api/connections/<id>/fields — the CRM lead fields (standard and custom)
// that a Facebook form question can be mapped to.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    const connection = await Connection.findOne({ _id: id, user: userId, platform: CRM_PLATFORMS }).select(
      "+webhookUrl +jwtToken",
    );
    if (!connection) {
      return localizedJson({ message: "CRM ulanishi topilmadi" }, { status: 404 });
    }

    try {
      return NextResponse.json(await loadCrmFields(connection, await amoLabels()));
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
    const connection = await Connection.findOne({ _id: id, user: userId, platform: CRM_PLATFORMS }).select(
      "+webhookUrl +jwtToken",
    );
    if (!connection) {
      return localizedJson({ message: "CRM ulanishi topilmadi" }, { status: 404 });
    }

    try {
      const input = { label, type, multiple: body?.multiple === true, options };
      const field =
        connection.platform === "amocrm"
          ? await createAmoLeadField(
              { accountUrl: connection.accountUrl!, token: connection.jwtToken! },
              input,
              await amoLabels(),
            )
          : await createBitrixLeadField(connection.webhookUrl!, input);
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
