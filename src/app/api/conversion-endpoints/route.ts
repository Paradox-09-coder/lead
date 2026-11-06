import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { ConversionEndpoint } from "@/models/ConversionEndpoint";
import { getSessionUserId } from "@/lib/server-session";
import { ApiError, toErrorResponseBody } from "@/lib/api-error";
import { ConversionSendError, lookupPixelName } from "@/lib/conversions";
import { MAX_ENDPOINTS_PER_USER, parseEndpointFields, toPublicEndpoint } from "@/lib/conversion-endpoints";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  await connectDB();
  const endpoints = await ConversionEndpoint.find({ user: userId }).select("+accessToken").sort({ createdAt: -1 });
  return NextResponse.json(endpoints.map(toPublicEndpoint));
}

// POST /api/conversion-endpoints — connects a Pixel (Conversions API token) and
// creates the public URL that sends events to it.
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const fields = parseEndpointFields(body);
    if (!fields.name || !fields.pixelId || !fields.accessToken) {
      throw new ApiError("Barcha maydonlar to'ldirilishi shart");
    }

    await connectDB();
    if ((await ConversionEndpoint.countDocuments({ user: userId })) >= MAX_ENDPOINTS_PER_USER) {
      throw new ApiError(`Eng ko'pi bilan ${MAX_ENDPOINTS_PER_USER} ta endpoint yaratish mumkin`);
    }

    let pixelName: string | undefined;
    try {
      pixelName = await lookupPixelName(fields.pixelId, fields.accessToken);
    } catch (error) {
      if (error instanceof ConversionSendError) {
        return NextResponse.json({ message: error.message }, { status: error.code === 190 ? 422 : 502 });
      }
      throw error;
    }

    const endpoint = await ConversionEndpoint.create({
      user: userId,
      name: fields.name,
      key: crypto.randomBytes(24).toString("hex"),
      pixelId: fields.pixelId,
      pixelName,
      accessToken: fields.accessToken,
      eventName: fields.eventName,
      currency: fields.currency,
      countryCode: fields.countryCode,
      testEventCode: fields.testEventCode ?? undefined,
    });
    return NextResponse.json(toPublicEndpoint(endpoint), { status: 201 });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
