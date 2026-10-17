import { NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { WebForm } from "@/models/WebForm";
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
    const deleted = await WebForm.findOneAndDelete({ _id: id, user: userId });
    if (!deleted) {
      return localizedJson({ message: "Forma topilmadi" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
