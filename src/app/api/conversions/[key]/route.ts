import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ConversionEndpoint } from "@/models/ConversionEndpoint";
import { ConversionEvent } from "@/models/ConversionEvent";
import {
  buildConversionEvent,
  ConversionSendError,
  normalizePhone,
  parseAmount,
  sendConversionEvent,
} from "@/lib/conversions";

export const runtime = "nodejs";

const MAX_TEXT = 200;
const KEY_PATTERN = /^[a-f0-9]{48}$/;

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Query string first, then the body (JSON, or a form as Bitrix24 / amoCRM
// webhooks send it); a body value wins over the same name in the query.
async function readParams(request: NextRequest): Promise<Record<string, unknown>> {
  const params: Record<string, unknown> = Object.fromEntries(request.nextUrl.searchParams);
  if (request.method !== "POST") return params;

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body: unknown = await request.json();
      if (body && typeof body === "object" && !Array.isArray(body)) Object.assign(params, body);
    } else if (contentType.includes("form-urlencoded") || contentType.includes("multipart/form-data")) {
      for (const [name, value] of (await request.formData()).entries()) {
        if (typeof value === "string") params[name] = value;
      }
    }
  } catch {
    // An unreadable body counts as no body; the missing fields are reported below.
  }
  return params;
}

const text = (value: unknown) =>
  (typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : typeof value === "number" ? String(value) : "") ||
  undefined;

// POST (or GET) /api/conversions/<key>?full_name=…&phone_number=…&summa=…
// Sends one Conversions API event for that customer to the Pixel this endpoint
// is connected to, using the Conversions API token saved with it. The key in the
// URL is the only credential.
async function handle(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!KEY_PATTERN.test(key)) return fail("Endpoint topilmadi", 404);

  await connectDB();
  const endpoint = await ConversionEndpoint.findOne({ key }).select("+accessToken");
  if (!endpoint) return fail("Endpoint topilmadi", 404);
  if (endpoint.status !== "active") return fail("Endpoint to'xtatilgan", 403);

  const input = await readParams(request);
  const fullName = text(input.full_name);
  const phoneRaw = text(input.phone_number ?? input.phone);
  const summaRaw = input.summa ?? input.amount;
  const hasSumma = summaRaw !== undefined && summaRaw !== null && String(summaRaw).trim() !== "";

  if (!phoneRaw) return fail("phone_number kerak", 400);
  const phone = normalizePhone(phoneRaw, endpoint.countryCode);
  if (!phone) return fail("phone_number noto'g'ri", 400);

  let summa: number | undefined;
  if (hasSumma) {
    const parsed = parseAmount(summaRaw);
    if (parsed === null) return fail("summa musbat son bo'lishi kerak", 400);
    summa = parsed;
  } else if ((endpoint.eventName as string) === "Purchase") {
    // Purchase is no longer offered, but endpoints saved with it still exist and Facebook needs a value.
    return fail("summa kerak (Purchase hodisasi uchun)", 400);
  }

  // A caller that retries a request sends the same event_id: it is not sent twice.
  const eventId = text(input.event_id) ?? crypto.randomUUID();
  if (text(input.event_id)) {
    const done = await ConversionEvent.exists({ endpoint: endpoint._id, eventId, status: "success" });
    if (done) return NextResponse.json({ ok: true, duplicate: true, event_id: eventId });
  }

  const event = buildConversionEvent({
    eventName: endpoint.eventName,
    eventId,
    eventTimeSeconds: Math.floor(Date.now() / 1000),
    fullName,
    phone,
    amount: summa,
    currency: endpoint.currency,
  });

  const record = {
    user: endpoint.user,
    endpoint: endpoint._id,
    eventName: endpoint.eventName,
    eventId,
    fullName,
    phone,
    summa,
    currency: summa !== undefined ? endpoint.currency : undefined,
    test: Boolean(endpoint.testEventCode),
  };

  try {
    const result = await sendConversionEvent({
      pixelId: endpoint.pixelId,
      accessToken: endpoint.accessToken,
      event,
      testEventCode: endpoint.testEventCode,
    });
    await ConversionEvent.create({ ...record, status: "success", fbtraceId: result.fbtraceId }).catch((error) =>
      console.error("[conversions] could not log event", error),
    );
    return NextResponse.json({
      ok: true,
      event_id: eventId,
      events_received: result.eventsReceived,
      fbtrace_id: result.fbtraceId ?? null,
      test: record.test,
    });
  } catch (error) {
    const message = error instanceof ConversionSendError ? error.message : "Server xatosi";
    if (!(error instanceof ConversionSendError)) console.error("[conversions] unexpected failure", error);
    await ConversionEvent.create({ ...record, status: "failed", errorMessage: message }).catch((logError) =>
      console.error("[conversions] could not log event", logError),
    );
    return fail(message, 502);
  }
}

export { handle as GET, handle as POST };
