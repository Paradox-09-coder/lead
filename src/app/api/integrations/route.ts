import { NextRequest, NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { Integration, type IntegrationDocument } from "@/models/Integration";
import { getSessionUserId } from "@/lib/server-session";
import { toErrorResponseBody } from "@/lib/api-error";
import {
  FieldMappingError,
  normalizeFieldMapping,
  normalizeHiddenFields,
  normalizeSourceId,
} from "@/lib/field-mapping";

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
    sourceId: integration.sourceId ?? null,
    fieldMapping: (integration.fieldMapping ?? []).map((entry) => ({
      questionKey: entry.questionKey,
      questionLabel: entry.questionLabel ?? null,
      crmField: entry.crmField,
    })),
    hiddenFields: (integration.hiddenFields ?? []).map((entry) => ({
      crmField: entry.crmField,
      value: entry.value,
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
    const {
      name,
      facebookConnectionId,
      formId,
      formName,
      targetConnectionId,
      stageId,
      sourceId,
      duplicateCheck,
      fieldMapping,
      hiddenFields,
    } = (await request.json()) as {
      name?: string;
      facebookConnectionId?: string;
      formId?: string;
      formName?: string;
      targetConnectionId?: string;
      stageId?: string;
      sourceId?: string;
      duplicateCheck?: boolean;
      fieldMapping?: unknown;
      hiddenFields?: unknown;
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

    // Which Facebook question goes to which Bitrix24 field, the lead source and
    // the fixed-value hidden fields (Bitrix24 only).
    let normalizedMapping;
    let normalizedSourceId;
    let normalizedHiddenFields;
    if (targetConnection.platform === "bitrix24") {
      try {
        const webhookUrl = targetConnection.webhookUrl!;
        if (Array.isArray(fieldMapping) && fieldMapping.length > 0) {
          normalizedMapping = await normalizeFieldMapping(webhookUrl, fieldMapping);
        }
        normalizedSourceId = await normalizeSourceId(webhookUrl, sourceId);
        if (Array.isArray(hiddenFields) && hiddenFields.length > 0) {
          normalizedHiddenFields = await normalizeHiddenFields(webhookUrl, hiddenFields);
        }
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
      sourceId: normalizedSourceId,
      fieldMapping: normalizedMapping,
      hiddenFields: normalizedHiddenFields,
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
