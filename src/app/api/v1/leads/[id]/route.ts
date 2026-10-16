import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { authenticateApiKey } from "@/lib/api-keys";
import { toPublicLead } from "@/lib/public-lead";

export const runtime = "nodejs";

// GET /api/v1/leads/:id — one lead of the key owner.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await authenticateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: "API kalit noto'g'ri yoki berilmagan" }, { status: 401 });
  }

  await connectDB();
  const lead = await Lead.findOne({ _id: id, user: userId }).catch(() => null);
  if (!lead) {
    return NextResponse.json({ error: "Lid topilmadi" }, { status: 404 });
  }
  return NextResponse.json({ data: toPublicLead(lead) });
}
