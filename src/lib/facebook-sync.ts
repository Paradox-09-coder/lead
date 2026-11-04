import { Connection, type ConnectionDocument } from "@/models/Connection";
import { Integration, type IntegrationDocument } from "@/models/Integration";
import { Lead } from "@/models/Lead";
import { FACEBOOK_GRAPH_VERSION } from "@/lib/facebook-oauth";
import { deliverLeadToCrm, extractFields, type FacebookFieldDatum } from "@/lib/lead-delivery";

// Pulls leads straight from each active integration's Facebook form
// (GET /{form-id}/leads) and stores the ones LeadSync never received. This is
// the safety net for webhooks that never arrive — app not Live, Page not
// subscribed, Leads Access Manager blocking the app — and it reports exactly
// which of those Facebook complains about.

interface GraphLead {
  id: string;
  created_time: string;
  field_data?: FacebookFieldDatum[];
}

interface GraphPage<T> {
  data?: T[];
  paging?: { next?: string };
  error?: { message: string };
}

export interface SyncProblem {
  scope: string; // Page or form name the problem belongs to
  message: string;
}

export interface SyncResult {
  checkedForms: number;
  imported: number;
  problems: SyncProblem[];
}

const MAX_PAGES_PER_FORM = 5; // 5 × 100 leads per sync is plenty for a catch-up

async function graphJson<T>(url: URL, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as T & { error?: { message: string } };
  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? `Facebook HTTP ${response.status}`);
  }
  return body;
}

// (Re)subscribes the Page to this app's `leadgen` webhook. Idempotent, and the
// only way to find out whether Facebook will actually send us webhooks.
export async function subscribePageToLeadgen(pageId: string, pageAccessToken: string): Promise<void> {
  const url = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${pageId}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", "leadgen");
  url.searchParams.set("access_token", pageAccessToken);
  const body = await graphJson<{ success?: boolean }>(url, { method: "POST" });
  if (!body.success) throw new Error("Sahifani leadgen webhook'iga obuna qilib bo'lmadi");
}

async function fetchFormLeads(formId: string, since: Date, pageAccessToken: string): Promise<GraphLead[]> {
  const first = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${formId}/leads`);
  first.searchParams.set("fields", "id,created_time,field_data");
  first.searchParams.set("limit", "100");
  first.searchParams.set(
    "filtering",
    JSON.stringify([
      { field: "time_created", operator: "GREATER_THAN", value: Math.floor(since.getTime() / 1000) },
    ]),
  );
  first.searchParams.set("access_token", pageAccessToken);

  const leads: GraphLead[] = [];
  let next: URL | null = first;
  for (let page = 0; next && page < MAX_PAGES_PER_FORM; page++) {
    const body: GraphPage<GraphLead> = await graphJson<GraphPage<GraphLead>>(next);
    leads.push(...(body.data ?? []));
    next = body.paging?.next ? new URL(body.paging.next) : null;
  }
  return leads;
}

async function importFormLeads(
  integration: IntegrationDocument,
  facebookConnection: ConnectionDocument,
): Promise<number> {
  // Leads submitted before the integration existed were never ours to deliver.
  const graphLeads = await fetchFormLeads(
    integration.formId,
    integration.createdAt,
    facebookConnection.pageAccessToken!,
  );
  if (graphLeads.length === 0) return 0;

  const known = new Set(
    (await Lead.find({ leadgenId: { $in: graphLeads.map((l) => l.id) } }).select("leadgenId")).map(
      (l) => l.leadgenId,
    ),
  );

  let imported = 0;
  for (const graphLead of graphLeads) {
    if (known.has(graphLead.id)) continue;
    const fieldData = graphLead.field_data ?? [];
    const lead = new Lead({
      user: integration.user,
      source: "facebook",
      leadgenId: graphLead.id,
      integration: integration._id,
      targetConnection: integration.targetConnection,
      stageId: integration.stageId,
      pageId: integration.pageId,
      formId: integration.formId,
      formName: integration.formName,
      rawFieldData: fieldData,
      fields: extractFields(fieldData),
      createdAt: new Date(graphLead.created_time),
    });
    // Store first: the unique leadgenId makes this the claim on the lead, so a
    // webhook arriving at the same moment can't push it to the CRM twice.
    try {
      await lead.save();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) continue;
      throw error;
    }
    // A missed webhook may still have reached the CRM some other way (e.g. the
    // CRM's own Facebook connector), so always match before creating.
    await deliverLeadToCrm(lead, { duplicateCheck: true, fieldMapping: integration.fieldMapping });
    imported++;
  }
  return imported;
}

export async function syncFacebookLeads(userId: string): Promise<SyncResult> {
  const integrations = await Integration.find({ user: userId, status: "active" });
  const result: SyncResult = { checkedForms: 0, imported: 0, problems: [] };
  if (integrations.length === 0) return result;

  const connectionIds = [...new Set(integrations.map((i) => i.facebookConnection.toString()))];
  const connections = await Connection.find({ _id: { $in: connectionIds }, user: userId }).select(
    "+pageAccessToken",
  );
  const connectionById = new Map(connections.map((c) => [c._id.toString(), c]));

  for (const connection of connections) {
    if (!connection.pageId || !connection.pageAccessToken) continue;
    try {
      await subscribePageToLeadgen(connection.pageId, connection.pageAccessToken);
    } catch (error) {
      result.problems.push({
        scope: connection.label,
        message: `Webhook obunasi: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  for (const integration of integrations) {
    const connection = connectionById.get(integration.facebookConnection.toString());
    if (!connection?.pageAccessToken) {
      result.problems.push({ scope: integration.formName, message: "Facebook ulanishi topilmadi" });
      continue;
    }
    try {
      result.imported += await importFormLeads(integration, connection);
      result.checkedForms++;
    } catch (error) {
      result.problems.push({
        scope: integration.formName,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return result;
}
