import { Connection } from "@/models/Connection";
import { Integration, type FieldMappingEntry, type IntegrationDocument } from "@/models/Integration";
import { Lead, type LeadDocument } from "@/models/Lead";
import { pushLeadToCrm, type CrmLeadMeta, type LeadFields } from "@/lib/crm-push";
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

const UTM_KEYS = ["source", "medium", "campaign", "content", "term"] as const;

function crmLeadMeta(lead: LeadDocument, fieldMapping?: FieldMappingEntry[]): CrmLeadMeta {
  const name = lead.fields?.name;
  if (lead.source === "form") {
    const formName = lead.webFormName ?? "Veb-forma";
    const utm = lead.utm;
    const utmLine = utm
      ? UTM_KEYS.filter((key) => utm[key])
          .map((key) => `utm_${key}=${utm[key]}`)
          .join(", ")
      : "";
    return {
      title: name ? `${formName} — ${name}` : formName,
      sourceId: "WEB",
      sourceDescription: [`LeadSync veb-forma: ${formName}`, utmLine].filter(Boolean).join("\n"),
      utm,
    };
  }
  if (lead.source === "api") {
    return { title: name ? `API lead — ${name}` : "API lead", sourceId: "OTHER" };
  }
  return {
    title: name ? `Facebook lead — ${name}` : "Facebook lead",
    sourceId: "FACEBOOK",
    sourceDescription: lead.formName ? `LeadSync Facebook forma: ${lead.formName}` : undefined,
    fieldMapping,
    answers: Array.isArray(lead.rawFieldData) ? (lead.rawFieldData as FacebookFieldDatum[]) : undefined,
  };
}

// Sends a stored lead to its CRM connection and records the outcome on the lead.
// With `duplicateCheck`, a lead the CRM already has (same phone/email) is
// linked to that card instead of creating a second one.
export async function deliverLeadToCrm(
  lead: LeadDocument,
  options: { duplicateCheck?: boolean; fieldMapping?: FieldMappingEntry[] } = {},
): Promise<LeadDocument> {
  if (!lead.targetConnection) {
    lead.status = "saved";
    await lead.save();
    return lead;
  }

  const connection = await Connection.findById(lead.targetConnection).select("+webhookUrl +jwtToken");
  try {
    if (!connection) throw new Error("CRM ulanishi topilmadi (o'chirilgan bo'lishi mumkin)");
    const result = await pushLeadToCrm(connection, lead.fields, lead.stageId, crmLeadMeta(lead, options.fieldMapping), options);
    lead.crmLeadId = result.id;
    lead.crmDuplicate = result.duplicate || undefined;
    lead.status = "success";
    lead.errorMessage = undefined;
  } catch (error) {
    lead.status = "failed";
    lead.errorMessage = error instanceof Error ? error.message : String(error);
  }
  await lead.save();
  return lead;
}

export async function fetchFacebookLead(leadgenId: string, pageAccessToken: string): Promise<FacebookFieldDatum[]> {
  const url = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${leadgenId}`);
  url.searchParams.set("access_token", pageAccessToken);
  const response = await fetch(url);
  const body = (await response.json()) as { field_data?: FacebookFieldDatum[]; error?: { message: string } };
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Facebook'dan lid ma'lumoti olinmadi");
  }
  return body.field_data ?? [];
}

// A page+form pair can have several integrations (e.g. a stale one pointing at
// connections that were since deleted). Pick the newest one whose Facebook and
// CRM connections still exist; fall back to the newest active one so the
// failure is recorded against something.
async function findIntegration(pageId: string, formId: string): Promise<IntegrationDocument | null> {
  const candidates = await Integration.find({ pageId, formId, status: "active" }).sort({ createdAt: -1 });
  for (const candidate of candidates) {
    const [facebookConnection, crmConnection] = await Promise.all([
      Connection.exists({ _id: candidate.facebookConnection }),
      Connection.exists({ _id: candidate.targetConnection }),
    ]);
    if (facebookConnection && crmConnection) return candidate;
  }
  return candidates[0] ?? null;
}

// Handles one Facebook `leadgen` webhook event: finds the matching integration,
// downloads the lead, stores it and pushes it to the CRM. Every lead is stored,
// including failures, so it shows up in "Lid tempi" and can be retried.
export async function processFacebookLead(value: LeadgenChangeValue): Promise<void> {
  const existing = await Lead.findOne({ leadgenId: value.leadgen_id });
  if (existing && existing.status !== "failed") return;

  const integration = await findIntegration(value.page_id, value.form_id);
  if (!integration) {
    console.warn(
      "[facebook-webhook] no active integration for page/form",
      value.page_id,
      value.form_id,
      value.leadgen_id,
    );
    return;
  }

  const lead =
    existing ??
    new Lead({
      user: integration.user,
      source: "facebook",
      leadgenId: value.leadgen_id,
      pageId: value.page_id,
      formId: value.form_id,
    });
  // A re-processed failed lead follows the integration as it is now.
  lead.integration = integration._id;
  lead.targetConnection = integration.targetConnection;
  lead.stageId = integration.stageId;
  lead.formName = integration.formName;

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

  // Store before pushing: if a sync (or a redelivered webhook) already claimed
  // this leadgenId, the unique index stops a second CRM push.
  try {
    await lead.save();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return;
    throw error;
  }
  await deliverLeadToCrm(lead, {
    duplicateCheck: integration.duplicateCheck,
    fieldMapping: integration.fieldMapping,
  });
}

// Re-attempts delivery of a failed lead. A Facebook lead whose answers were
// never downloaded is fetched again first.
export async function retryLead(lead: LeadDocument): Promise<LeadDocument> {
  lead.retryCount += 1;

  const hasFields = Boolean(lead.fields?.name || lead.fields?.phone || lead.fields?.email);
  let fieldMapping: FieldMappingEntry[] | undefined;
  if (lead.source === "facebook" && lead.pageId && lead.formId) {
    const current = await findIntegration(lead.pageId, lead.formId);
    if (current) {
      lead.integration = current._id;
      lead.targetConnection = current.targetConnection;
      lead.stageId = current.stageId;
      lead.formName = current.formName;
      fieldMapping = current.fieldMapping;
    }
  }
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

  return deliverLeadToCrm(lead, { fieldMapping });
}
