import { NextRequest, NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { ConversionEndpoint } from "@/models/ConversionEndpoint";
import { ConversionEvent } from "@/models/ConversionEvent";
import { getSessionUserId } from "@/lib/server-session";
import { toErrorResponseBody } from "@/lib/api-error";
import { ConversionSendError, lookupPixelName } from "@/lib/conversions";
import { parseEndpointFields, toPublicEndpoint } from "@/lib/conversion-endpoints";

export const runtime = "nodejs";

// PATCH /api/conversion-endpoints/<id> — rename, pause/resume, change the event,
// currency, test mode, or the Pixel / token (the token stays as it is unless a
// new one is sent).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const fields = parseEndpointFields(body);

    await connectDB();
    const endpoint = await ConversionEndpoint.findOne({ _id: id, user: userId }).select("+accessToken");
    if (!endpoint) {
      return localizedJson({ message: "Endpoint topilmadi" }, { status: 404 });
    }

    const connectionChanged =
      (fields.pixelId !== undefined && fields.pixelId !== endpoint.pixelId) ||
      (fields.accessToken !== undefined && fields.accessToken !== endpoint.accessToken);
    if (connectionChanged) {
      try {
        endpoint.pixelName = await lookupPixelName(
          fields.pixelId ?? endpoint.pixelId,
          fields.accessToken ?? endpoint.accessToken,
        );
      } catch (error) {
        if (error instanceof ConversionSendError) {
          return NextResponse.json({ message: error.message }, { status: error.code === 190 ? 422 : 502 });
        }
        throw error;
      }
    }

    if (fields.name !== undefined) endpoint.name = fields.name;
    if (fields.pixelId !== undefined) endpoint.pixelId = fields.pixelId;
    if (fields.accessToken !== undefined) endpoint.accessToken = fields.accessToken;
    if (fields.eventName !== undefined) endpoint.eventName = fields.eventName;
    if (fields.currency !== undefined) endpoint.currency = fields.currency;
    if (fields.countryCode !== undefined) endpoint.countryCode = fields.countryCode;
    if (fields.testEventCode !== undefined) endpoint.testEventCode = fields.testEventCode ?? undefined;
    if (fields.status !== undefined) endpoint.status = fields.status;

    await endpoint.save();
    return NextResponse.json(toPublicEndpoint(endpoint));
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    const deleted = await ConversionEndpoint.findOneAndDelete({ _id: id, user: userId });
    if (!deleted) {
      return localizedJson({ message: "Endpoint topilmadi" }, { status: 404 });
    }
    await ConversionEvent.deleteMany({ endpoint: deleted._id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
