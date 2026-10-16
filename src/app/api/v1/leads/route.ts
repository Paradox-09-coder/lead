import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Connection, type ConnectionDocument } from "@/models/Connection";
import { Lead, type LeadDocument, type LeadStatus } from "@/models/Lead";
import { authenticateApiKey } from "@/lib/api-keys";
import { deliverLeadToCrm } from "@/lib/lead-delivery";
import { toPublicLead } from "@/lib/public-lead";

export const runtime = "nodejs";

const STATUSES: LeadStatus[] = ["pending", "success", "failed", "saved"];
const MAX_TEXT = 200;

function unauthorized() {
  return NextResponse.json(
    { error: "API kalit noto'g'ri yoki berilmagan. 'Authorization: Bearer <kalit>' sarlavhasini yuboring." },
    { status: 401 },
  );
}

// GET /api/v1/leads?status=failed&limit=50&page=1 — the key owner's leads, newest first.
export async function GET(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) return unauthorized();

  const params = request.nextUrl.searchParams;
  const status = params.get("status") as LeadStatus | null;
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: `status: ${STATUSES.join(" | ")}` }, { status: 400 });
  }
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 100);
  const page = Math.max(Number(params.get("page")) || 1, 1);

  const filter = { user: userId, ...(status ? { status } : {}) };
  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  return NextResponse.json({ data: leads.map(toPublicLead), page, limit, total });
}

// POST /api/v1/leads — an external app submits a lead. It is stored, and sent
// to the CRM given by `connection_id` (or the user's only CRM connection).
export async function POST(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON noto'g'ri" }, { status: 400 });
  }

  const text = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "") || undefined;
  const name = text(body.name);
  const phone = text(body.phone);
  const email = text(body.email);
  if (!name && !phone && !email) {
    return NextResponse.json({ error: "name, phone yoki email dan kamida bittasi kerak" }, { status: 400 });
  }

  const connectionId = text(body.connection_id);
  const stageId = text(body.stage_id);

  const crmPlatforms: ConnectionDocument["platform"][] = ["bitrix24", "amocrm"];
  const crmFilter = { user: userId, platform: { $in: crmPlatforms } };
  let targetConnection: { _id: unknown } | null = null;
  if (connectionId) {
    targetConnection = await Connection.findOne({ ...crmFilter, _id: connectionId }).catch(() => null);
    if (!targetConnection) {
      return NextResponse.json({ error: "connection_id topilmadi (GET /api/v1/connections)" }, { status: 404 });
    }
  } else {
    const connections = await Connection.find(crmFilter).limit(2);
    if (connections.length === 1) targetConnection = connections[0];
  }

  const lead: LeadDocument = new Lead({
    user: userId,
    source: "api",
    targetConnection: targetConnection?._id,
    stageId,
    fields: { name, phone, email },
  });
  await lead.save();
  await deliverLeadToCrm(lead);

  const status = lead.status === "failed" ? 502 : 201;
  return NextResponse.json({ data: toPublicLead(lead) }, { status });
}
