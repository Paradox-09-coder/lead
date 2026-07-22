import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Integration } from "@/models/Integration";
import { getSessionUserId } from "@/lib/server-session";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

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
