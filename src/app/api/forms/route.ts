import { NextRequest, NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { WebForm, WEB_FORM_SOURCES, type WebFormSource } from "@/models/WebForm";
import { getSessionUserId } from "@/lib/server-session";
import { generateFormSlug, toPublicWebForm } from "@/lib/web-forms";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

const MAX_TEXT = 120;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  await connectDB();
  const [forms, connections] = await Promise.all([
    WebForm.find({ user: userId }).sort({ createdAt: -1 }),
    Connection.find({ user: userId }),
  ]);

  const connectionLabels = new Map(connections.map((c) => [c._id.toString(), c.label]));
  return NextResponse.json(
    forms.map((form) => toPublicWebForm(form, connectionLabels.get(form.targetConnection.toString()))),
  );
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const text = (value: unknown) =>
      (typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "") || undefined;

    const name = text(body.name);
    const source = text(body.source) as WebFormSource | undefined;
    const targetConnectionId = text(body.targetConnectionId);
    if (!name || !source || !targetConnectionId) {
      return localizedJson({ message: "Manba, forma nomi va CRM tanlanishi shart" }, { status: 400 });
    }
    if (!WEB_FORM_SOURCES.includes(source)) {
      return localizedJson({ message: "Manba noto'g'ri" }, { status: 400 });
    }

    await connectDB();
    const targetConnection = await Connection.findOne({
      _id: targetConnectionId,
      user: userId,
      platform: { $in: ["bitrix24", "amocrm"] },
    });
    if (!targetConnection) {
      return localizedJson({ message: "CRM ulanishi topilmadi" }, { status: 404 });
    }

    const form = await WebForm.create({
      user: userId,
      name,
      slug: generateFormSlug(),
      source,
      utmMedium: text(body.utmMedium),
      utmCampaign: text(body.utmCampaign),
      utmContent: text(body.utmContent),
      targetConnection: targetConnection._id,
      stageId: text(body.stageId),
    });

    return NextResponse.json(toPublicWebForm(form, targetConnection.label), { status: 201 });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
