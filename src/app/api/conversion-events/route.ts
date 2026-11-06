import { NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { ConversionEndpoint } from "@/models/ConversionEndpoint";
import { ConversionEvent } from "@/models/ConversionEvent";
import { getSessionUserId } from "@/lib/server-session";

export const runtime = "nodejs";

const RECENT_LIMIT = 50;

// "998901234567" -> "+998 ••• 4567": enough to recognise a customer, not to call them.
function maskPhone(phone: string | undefined): string | null {
  if (!phone) return null;
  return phone.length <= 7 ? "•••" : `+${phone.slice(0, 3)} ••• ${phone.slice(-4)}`;
}

// GET /api/conversion-events — the latest requests to the user's endpoints and
// what Facebook answered.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  await connectDB();
  const [events, endpoints] = await Promise.all([
    ConversionEvent.find({ user: userId }).sort({ createdAt: -1 }).limit(RECENT_LIMIT),
    ConversionEndpoint.find({ user: userId }).select("name"),
  ]);
  const endpointNames = new Map(endpoints.map((endpoint) => [endpoint._id.toString(), endpoint.name]));

  return NextResponse.json(
    events.map((event) => ({
      _id: event._id.toString(),
      endpointName: endpointNames.get(event.endpoint.toString()) ?? null,
      eventName: event.eventName,
      fullName: event.fullName ?? null,
      phone: maskPhone(event.phone),
      summa: event.summa ?? null,
      currency: event.currency ?? null,
      status: event.status,
      error: event.errorMessage ?? null,
      test: event.test,
      createdAt: event.createdAt,
    })),
  );
}
