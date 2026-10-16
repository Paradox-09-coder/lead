import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { getSessionUserId } from "@/lib/server-session";
import { retryLead } from "@/lib/lead-delivery";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    const lead = await Lead.findOne({ _id: id, user: userId });
    if (!lead) {
      return NextResponse.json({ message: "Lid topilmadi" }, { status: 404 });
    }

    const updated = await retryLead(lead);
    if (updated.status === "failed") {
      return NextResponse.json({ message: updated.errorMessage ?? "Yuborilmadi" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
