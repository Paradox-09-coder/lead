import type { LeadDocument } from "@/models/Lead";

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
