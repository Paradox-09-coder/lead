import { NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/server-session";
import { syncFacebookLeads } from "@/lib/facebook-sync";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

// POST /api/leads/sync — pulls leads LeadSync missed from the user's
// Facebook lead forms and reports why webhooks may not be arriving.
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    return NextResponse.json(await syncFacebookLeads(userId));
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
