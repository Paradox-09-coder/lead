import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { Integration } from "@/models/Integration";
import { getSessionUserId } from "@/lib/server-session";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

// PATCH /api/integrations/<id> — rename, pause/resume, or change where leads go.
// The Facebook page/form is fixed once created; to change it, make a new integration.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      status?: string;
      targetConnectionId?: string;
      stageId?: string | null;
      duplicateCheck?: boolean;
    };

    await connectDB();
    const integration = await Integration.findOne({ _id: id, user: userId });
    if (!integration) {
      return NextResponse.json({ message: "Integratsiya topilmadi" }, { status: 404 });
    }

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ message: "Nom bo'sh bo'lmasligi kerak" }, { status: 400 });
      integration.name = name.slice(0, 120);
    }
    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "paused") {
        return NextResponse.json({ message: "Holat noto'g'ri" }, { status: 400 });
      }
      integration.status = body.status;
    }
    if (body.targetConnectionId !== undefined) {
      const target = await Connection.findOne({
        _id: body.targetConnectionId,
        user: userId,
        platform: { $in: ["bitrix24", "amocrm"] },
      });
      if (!target) return NextResponse.json({ message: "CRM ulanishi topilmadi" }, { status: 404 });
      integration.targetConnection = target._id;
    }
    if (body.stageId !== undefined) integration.stageId = body.stageId || undefined;
    if (body.duplicateCheck !== undefined) integration.duplicateCheck = body.duplicateCheck;

    await integration.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    const integration = await Integration.findOne({ _id: id, user: userId });
    if (!integration) {
      return NextResponse.json({ message: "Integratsiya topilmadi" }, { status: 404 });
    }
    await integration.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
