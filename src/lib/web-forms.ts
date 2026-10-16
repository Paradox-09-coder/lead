import { randomBytes } from "crypto";
import type { WebFormDocument } from "@/models/WebForm";

export function appBaseUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "https://leadsync-production-5873.up.railway.app";
}

// 8 URL-safe characters — short enough to share, unguessable enough that
// forms can't be enumerated.
export function generateFormSlug(): string {
  return randomBytes(6).toString("base64url");
}

// The shareable link: the form's UTM settings are baked into the query string
// so they survive copy-paste and show up in the CRM. utm_content falls back to
// the form name so each video/post is identifiable.
export function webFormUrl(form: WebFormDocument): string {
  const url = new URL(`/f/${form.slug}`, appBaseUrl());
  url.searchParams.set("utm_source", form.source);
  if (form.utmMedium) url.searchParams.set("utm_medium", form.utmMedium);
  if (form.utmCampaign) url.searchParams.set("utm_campaign", form.utmCampaign);
  url.searchParams.set("utm_content", form.utmContent || form.name);
  return url.toString();
}

export function toPublicWebForm(form: WebFormDocument, connectionLabel: string | undefined) {
  return {
    _id: form._id.toString(),
    name: form.name,
    source: form.source,
    target: connectionLabel ?? "?",
    url: webFormUrl(form),
    createdAt: form.createdAt,
  };
}
