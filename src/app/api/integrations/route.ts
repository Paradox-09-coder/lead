import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { Integration, type IntegrationDocument } from "@/models/Integration";
import { getSessionUserId } from "@/lib/server-session";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

function toPublicIntegration(integration: IntegrationDocument, connectionLabels: Map<string, string>) {
  return {
    _id: integration._id,
    name: integration.name,
    source: `Facebook — ${connectionLabels.get(integration.facebookConnection.toString()) ?? "?"} / ${integration.formName}`,
    target: connectionLabels.get(integration.targetConnection.toString()) ?? "?",
    targetConnectionId: integration.targetConnection.toString(),
    stageId: integration.stageId ?? null,
    duplicateCheck: integration.duplicateCheck,
    status: integration.status,
    createdAt: integration.createdAt,
  };
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
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
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const { name, facebookConnectionId, formId, formName, targetConnectionId, stageId, duplicateCheck } =
      (await request.json()) as {
        name?: string;
        facebookConnectionId?: string;
        formId?: string;
        formName?: string;
        targetConnectionId?: string;
        stageId?: string;
        duplicateCheck?: boolean;
      };

    if (!name || !facebookConnectionId || !formId || !formName || !targetConnectionId) {
      return NextResponse.json({ message: "Barcha maydonlar to'ldirilishi shart" }, { status: 400 });
    }

    await connectDB();

    const facebookConnection = await Connection.findOne({
      _id: facebookConnectionId,
      user: userId,
      platform: "facebook",
    });
    if (!facebookConnection) {
      return NextResponse.json({ message: "Facebook ulanishi topilmadi" }, { status: 404 });
    }

    const targetConnection = await Connection.findOne({
      _id: targetConnectionId,
      user: userId,
      platform: { $in: ["bitrix24", "amocrm"] },
    });
    if (!targetConnection) {
      return NextResponse.json({ message: "CRM ulanishi topilmadi" }, { status: 404 });
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
      duplicateCheck: duplicateCheck ?? true,
    });

    const connectionLabels = new Map([
      [facebookConnection._id.toString(), facebookConnection.label],
      [targetConnection._id.toString(), targetConnection.label],
    ]);
    return NextResponse.json(toPublicIntegration(integration, connectionLabels), { status: 201 });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
