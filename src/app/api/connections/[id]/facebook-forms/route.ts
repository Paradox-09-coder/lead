import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { getSessionUserId } from "@/lib/server-session";
import { FACEBOOK_GRAPH_VERSION } from "@/lib/facebook-oauth";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    const connection = await Connection.findOne({ _id: id, user: userId, platform: "facebook" }).select(
      "+pageAccessToken",
    );

    if (!connection) {
      return NextResponse.json({ message: "Facebook ulanishi topilmadi" }, { status: 404 });
    }

    const formsUrl = new URL(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${connection.pageId}/leadgen_forms`,
    );
    formsUrl.searchParams.set("fields", "id,name,status");
    formsUrl.searchParams.set("access_token", connection.pageAccessToken!);

    const response = await fetch(formsUrl);
    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: body?.error?.message ?? "Formalar ro'yxati olinmadi" }, { status: 502 });
    }

    const forms = (body.data ?? []).map((form: { id: string; name: string; status: string }) => ({
      id: form.id,
      name: form.name,
      status: form.status,
    }));
    return NextResponse.json(forms);
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
