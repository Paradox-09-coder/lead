import { NextRequest, NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { Integration, type IntegrationDocument } from "@/models/Integration";
import { getSessionUserId } from "@/lib/server-session";
import { toErrorResponseBody } from "@/lib/api-error";
import { FieldMappingError, normalizeFieldMapping } from "@/lib/field-mapping";

export const runtime = "nodejs";

function toPublicIntegration(integration: IntegrationDocument, connectionLabels: Map<string, string>) {
  return {
    _id: integration._id,
    name: integration.name,
    source: `Facebook — ${connectionLabels.get(integration.facebookConnection.toString()) ?? "?"} / ${integration.formName}`,
    target: connectionLabels.get(integration.targetConnection.toString()) ?? "?",
    targetConnectionId: integration.targetConnection.toString(),
    facebookConnectionId: integration.facebookConnection.toString(),
    formId: integration.formId,
    stageId: integration.stageId ?? null,
    fieldMapping: (integration.fieldMapping ?? []).map((entry) => ({
      questionKey: entry.questionKey,
      questionLabel: entry.questionLabel ?? null,
      crmField: entry.crmField,
    })),
    duplicateCheck: integration.duplicateCheck,
    status: integration.status,
    createdAt: integration.createdAt,
  };
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  await connectDB();
  const [integrations, connections] = await Promise.all([
    Integration.find({ user: userId }).sort({ createdAt: -1 }),
    Connection.find({ user: userId }),
  ]);

  const connectionLabels = new Map(connections.map((c) => [c._id.toString(), c.label]));
  return NextResponse.json(integrations.map((i) => toPublicIntegration(i, connectionLabels)));
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const { name, facebookConnectionId, formId, formName, targetConnectionId, stageId, duplicateCheck, fieldMapping } =
      (await request.json()) as {
        name?: string;
        facebookConnectionId?: string;
        formId?: string;
        formName?: string;
        targetConnectionId?: string;
        stageId?: string;
        duplicateCheck?: boolean;
        fieldMapping?: unknown;
      };

    if (!name || !facebookConnectionId || !formId || !formName || !targetConnectionId) {
      return localizedJson({ message: "Barcha maydonlar to'ldirilishi shart" }, { status: 400 });
    }

    await connectDB();

    const facebookConnection = await Connection.findOne({
      _id: facebookConnectionId,
      user: userId,
      platform: "facebook",
    });
    if (!facebookConnection) {
      return localizedJson({ message: "Facebook ulanishi topilmadi" }, { status: 404 });
    }

    const targetConnection = await Connection.findOne({
      _id: targetConnectionId,
      user: userId,
      platform: { $in: ["bitrix24", "amocrm"] },
    }).select("+webhookUrl");
    if (!targetConnection) {
      return localizedJson({ message: "CRM ulanishi topilmadi" }, { status: 404 });
    }

    // Which Facebook question goes to which Bitrix24 field (Bitrix24 only).
    let normalizedMapping;
    if (targetConnection.platform === "bitrix24" && Array.isArray(fieldMapping) && fieldMapping.length > 0) {
      try {
        normalizedMapping = await normalizeFieldMapping(targetConnection.webhookUrl!, fieldMapping);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Maydonlar tekshirilmadi";
        return NextResponse.json({ message }, { status: error instanceof FieldMappingError ? 400 : 502 });
      }
    }

    const integration = await Integration.create({
      user: userId,
      name,
      facebookConnection: facebookConnection._id,
      pageId: facebookConnection.pageId,
      formId,
      formName,
      targetConnection: targetConnection._id,
      stageId,
      fieldMapping: normalizedMapping,
      duplicateCheck: duplicateCheck ?? true,
    });

    const connectionLabels = new Map([
      [facebookConnection._id.toString(), facebookConnection.label],
      [targetConnection._id.toString(), targetConnection.label],
    ]);
    return NextResponse.json(toPublicIntegration(integration, connectionLabels), { status: 201 });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
