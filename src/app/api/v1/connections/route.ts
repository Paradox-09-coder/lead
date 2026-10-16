import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@/models/Connection";
import { authenticateApiKey } from "@/lib/api-keys";

export const runtime = "nodejs";

// GET /api/v1/connections — the key owner's CRM connections, so an external
// app knows which `connection_id` to pass when submitting a lead.
export async function GET(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: "API kalit noto'g'ri yoki berilmagan" }, { status: 401 });
  }

  const connections = await Connection.find({ user: userId, platform: { $in: ["bitrix24", "amocrm"] } });
  return NextResponse.json({
    data: connections.map((c) => ({ id: c._id.toString(), platform: c.platform, label: c.label })),
  });
}
