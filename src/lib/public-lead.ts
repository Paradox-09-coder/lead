import type { LeadDocument, LeadSource } from "@/models/Lead";

// i18n key for how each lead source is labelled in dashboard tables.
const LEAD_SOURCE_KEYS: Record<LeadSource, string> = {
  facebook: "leadTempo.sourceFacebook",
  api: "leadTempo.sourceApi",
  form: "leadTempo.sourceForm",
};

// The shape of a lead in the public API (and in dashboard tables): no internal
// ids of other collections, no raw Facebook payload.
export function toPublicLead(lead: LeadDocument) {
  return {
    id: lead._id.toString(),
    source: lead.source,
    status: lead.status,
    name: lead.fields?.name ?? null,
    phone: lead.fields?.phone ?? null,
    email: lead.fields?.email ?? null,
    crm_lead_id: lead.crmLeadId ?? null,
    error: lead.errorMessage ?? null,
    retry_count: lead.retryCount,
    created_at: lead.createdAt,
  };
}

// Older leads may have been stored without a source, so fall back to the API label.
export function leadSourceKey(source: LeadSource | undefined): string {
  return (source && LEAD_SOURCE_KEYS[source]) || LEAD_SOURCE_KEYS.api;
}
