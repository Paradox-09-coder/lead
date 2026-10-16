import { Connection } from "@/models/Connection";
import { Integration } from "@/models/Integration";
import { Lead, type LeadDocument } from "@/models/Lead";
import { pushLeadToCrm, type LeadFields } from "@/lib/crm-push";
import { FACEBOOK_GRAPH_VERSION } from "@/lib/facebook-oauth";

export interface FacebookFieldDatum {
  name: string;
  values?: string[];
}

export interface LeadgenChangeValue {
  form_id: string;
  leadgen_id: string;
  page_id: string;
}

export function extractFields(fieldData: FacebookFieldDatum[]): LeadFields {
  const byName = new Map<string, string>();
  for (const item of fieldData) {
    const value = item.values?.[0];
    if (value) byName.set(item.name.toLowerCase(), value);
  }

  const fields: LeadFields = {};
  const fullName = byName.get("full_name");
  const combined = [byName.get("first_name"), byName.get("last_name")].filter(Boolean).join(" ");
  fields.name = fullName ?? (combined || undefined);
  for (const [key, value] of byName) {
    if (!fields.email && key.includes("email")) fields.email = value;
    if (!fields.phone && key.includes("phone")) fields.phone = value;
  }
  return fields;
}

// Sends a stored lead to its CRM connection and records the outcome on the lead.
export async function deliverLeadToCrm(lead: LeadDocument): Promise<LeadDocument> {
  if (!lead.targetConnection) {
    lead.status = "saved";
    await lead.save();
    return lead;
  }

  const connection = await Connection.findById(lead.targetConnection).select("+webhookUrl +jwtToken");
  try {
    if (!connection) throw new Error("CRM ulanishi topilmadi (o'chirilgan bo'lishi mumkin)");
    lead.crmLeadId = await pushLeadToCrm(connection, lead.fields, lead.stageId);
    lead.status = "success";
    lead.errorMessage = undefined;
  } catch (error) {
    lead.status = "failed";
    lead.errorMessage = error instanceof Error ? error.message : String(error);
  }
  await lead.save();
  return lead;
}

async function fetchFacebookLead(leadgenId: string, pageAccessToken: string): Promise<FacebookFieldDatum[]> {
  const url = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${leadgenId}`);
  url.searchParams.set("access_token", pageAccessToken);
  const response = await fetch(url);
  const body = (await response.json()) as { field_data?: FacebookFieldDatum[]; error?: { message: string } };
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Facebook'dan lid ma'lumoti olinmadi");
  }
  return body.field_data ?? [];
}

// Handles one Facebook `leadgen` webhook event: finds the matching integration,
// downloads the lead, stores it and pushes it to the CRM. Every lead is stored,
// including failures, so it shows up in "Lid tempi" and can be retried.
export async function processFacebookLead(value: LeadgenChangeValue): Promise<void> {
  const existing = await Lead.findOne({ leadgenId: value.leadgen_id });
  if (existing && existing.status !== "failed") return;

  const integration = await Integration.findOne({
    pageId: value.page_id,
    formId: value.form_id,
    status: "active",
  });
  if (!integration) return;

  const lead =
    existing ??
    new Lead({
      user: integration.user,
      source: "facebook",
      leadgenId: value.leadgen_id,
      integration: integration._id,
      targetConnection: integration.targetConnection,
      stageId: integration.stageId,
      pageId: value.page_id,
      formId: value.form_id,
    });

  try {
    const facebookConnection = await Connection.findById(integration.facebookConnection).select(
      "+pageAccessToken",
    );
    if (!facebookConnection?.pageAccessToken) throw new Error("Facebook ulanishi topilmadi");

    const fieldData = await fetchFacebookLead(value.leadgen_id, facebookConnection.pageAccessToken);
    lead.rawFieldData = fieldData;
    lead.fields = extractFields(fieldData);
  } catch (error) {
    lead.status = "failed";
    lead.errorMessage = error instanceof Error ? error.message : String(error);
    await lead.save();
    return;
  }

  await deliverLeadToCrm(lead);
}

// Re-attempts delivery of a failed lead. A Facebook lead whose answers were
// never downloaded is fetched again first.
export async function retryLead(lead: LeadDocument): Promise<LeadDocument> {
  lead.retryCount += 1;

  const hasFields = Boolean(lead.fields?.name || lead.fields?.phone || lead.fields?.email);
  if (!hasFields && lead.source === "facebook" && lead.leadgenId && lead.integration) {
    try {
      const integration = await Integration.findById(lead.integration);
      const facebookConnection = integration
        ? await Connection.findById(integration.facebookConnection).select("+pageAccessToken")
        : null;
      if (!facebookConnection?.pageAccessToken) throw new Error("Facebook ulanishi topilmadi");

      const fieldData = await fetchFacebookLead(lead.leadgenId, facebookConnection.pageAccessToken);
      lead.rawFieldData = fieldData;
      lead.fields = extractFields(fieldData);
    } catch (error) {
      lead.status = "failed";
      lead.errorMessage = error instanceof Error ? error.message : String(error);
      await lead.save();
      return lead;
    }
  }

  return deliverLeadToCrm(lead);
}
