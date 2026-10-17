import { NextRequest, NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { WebForm } from "@/models/WebForm";
import { Lead, type LeadUtm } from "@/models/Lead";
import { deliverLeadToCrm } from "@/lib/lead-delivery";

export const runtime = "nodejs";

const MAX_TEXT = 200;

// POST /api/f/<slug> — public submission of a LeadSync web form. No auth: the
// slug is the only credential. The lead is stored first, so a CRM failure
// still shows up in "Lid tempi" and can be retried; the visitor always gets
// a success response once the lead is stored.
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return localizedJson({ message: "Ma'lumot noto'g'ri" }, { status: 400 });
  }

  // Honeypot: real visitors never see or fill this field.
  if (typeof body.website === "string" && body.website !== "") {
    return NextResponse.json({ ok: true });
  }

  const text = (value: unknown) =>
    (typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "") || undefined;
  const name = text(body.name);
  const phone = text(body.phone);
  const email = text(body.email);
  if (!name || !phone) {
    return localizedJson({ message: "Ism va telefon raqam kiritilishi shart" }, { status: 400 });
  }
  if (phone.replace(/\D/g, "").length < 7) {
    return localizedJson({ message: "Telefon raqam noto'g'ri" }, { status: 400 });
  }

  await connectDB();
  const form = await WebForm.findOne({ slug });
  if (!form) {
    return localizedJson({ message: "Forma topilmadi" }, { status: 404 });
  }

  // UTM tags come from the link the visitor opened; the form's own settings
  // are the fallback for links shared without the query string.
  const rawUtm = (body.utm ?? {}) as Record<string, unknown>;
  const utm: LeadUtm = {
    source: text(rawUtm.source) ?? form.source,
    medium: text(rawUtm.medium) ?? form.utmMedium,
    campaign: text(rawUtm.campaign) ?? form.utmCampaign,
    content: text(rawUtm.content) ?? (form.utmContent || form.name),
    term: text(rawUtm.term),
  };

  const lead = new Lead({
    user: form.user,
    source: "form",
    webForm: form._id,
    webFormName: form.name,
    utm,
    targetConnection: form.targetConnection,
    stageId: form.stageId,
    fields: { name, phone, email },
  });
  await lead.save();
  await deliverLeadToCrm(lead);

  return NextResponse.json({ ok: true }, { status: 201 });
}
