import { NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { getSessionUserId } from "@/lib/server-session";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    const connection = await Connection.findOne({ _id: id, user: userId });
    if (!connection) {
      return localizedJson({ message: "Ulanish topilmadi" }, { status: 404 });
    }
    await connection.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
