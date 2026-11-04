import { NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { getSessionUserId } from "@/lib/server-session";
import { FACEBOOK_GRAPH_VERSION } from "@/lib/facebook-oauth";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

interface GraphQuestion {
  key?: string;
  label?: string;
  type?: string;
}

interface GraphForm {
  id: string;
  name: string;
  status: string;
  questions?: GraphQuestion[];
}

async function fetchForms(pageId: string, token: string, withQuestions: boolean) {
  const formsUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${pageId}/leadgen_forms`);
  formsUrl.searchParams.set("fields", withQuestions ? "id,name,status,questions" : "id,name,status");
  formsUrl.searchParams.set("limit", "100");
  formsUrl.searchParams.set("access_token", token);
  const response = await fetch(formsUrl);
  const body = await response.json();
  return { ok: response.ok, body };
}

// GET /api/connections/<id>/facebook-forms — the Page's lead forms together
// with each form's questions (key = the name the answer arrives under in a
// lead's field_data), so an integration can map every question to a CRM field.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    const connection = await Connection.findOne({ _id: id, user: userId, platform: "facebook" }).select(
      "+pageAccessToken",
    );

    if (!connection) {
      return localizedJson({ message: "Facebook ulanishi topilmadi" }, { status: 404 });
    }

    let result = await fetchForms(connection.pageId!, connection.pageAccessToken!, true);
    // The forms list matters more than the questions: if Facebook refuses the
    // `questions` field, still return the forms (the mapping step is skipped).
    if (!result.ok) {
      result = await fetchForms(connection.pageId!, connection.pageAccessToken!, false);
    }
    if (!result.ok) {
      return localizedJson({ message: result.body?.error?.message ?? "Formalar ro'yxati olinmadi" }, { status: 502 });
    }

    const forms = ((result.body.data ?? []) as GraphForm[]).map((form) => ({
      id: form.id,
      name: form.name,
      status: form.status,
      questions: (form.questions ?? [])
        .filter((q): q is Required<Pick<GraphQuestion, "key">> & GraphQuestion => Boolean(q.key))
        .map((q) => ({ key: q.key, label: q.label || q.key, type: q.type ?? "CUSTOM" })),
    }));
    return NextResponse.json(forms);
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
