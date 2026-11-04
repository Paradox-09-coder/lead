import mongoose from "mongoose";
import { Lead } from "@/models/Lead";
import { Connection } from "@/models/Connection";
import { Integration } from "@/models/Integration";
import { WebForm } from "@/models/WebForm";

// Uzbekistan has no DST, so "a day" is a fixed UTC+5 window.
export const REPORT_TIMEZONE = "Asia/Tashkent";
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CHART_DAYS = 90;

export const REPORT_PERIODS = ["1", "7", "30", "90", "all"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export interface Counts {
  total: number;
  success: number;
  failed: number;
  pending: number;
  saved: number;
  duplicates: number;
}

export interface DayPoint extends Counts {
  date: string; // YYYY-MM-DD in Tashkent time
}

export interface FormRow extends Counts {
  source: "facebook" | "form" | "api";
  formLabel: string | null; // null = no form (API leads, or old leads that never recorded one)
  crmLabel: string | null; // null = no CRM connection (leads were only saved)
  crmPlatform: string | null;
  last: Date;
}

export interface CrmRow extends Counts {
  label: string | null;
  platform: string | null;
}

export interface UtmRow {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  total: number;
  success: number;
}

export interface ErrorRow {
  message: string;
  total: number;
  last: Date;
}

export interface LeadReport {
  totals: Counts;
  bySource: Array<Counts & { source: "facebook" | "form" | "api" }>;
  byDay: DayPoint[];
  byForm: FormRow[];
  byCrm: CrmRow[];
  byUtm: UtmRow[];
  errors: ErrorRow[];
}

const EMPTY: Counts = { total: 0, success: 0, failed: 0, pending: 0, saved: 0, duplicates: 0 };

const COUNT_ACCUMULATORS = {
  total: { $sum: 1 },
  success: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
  failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
  pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
  saved: { $sum: { $cond: [{ $eq: ["$status", "saved"] }, 1, 0] } },
  duplicates: { $sum: { $cond: [{ $eq: ["$crmDuplicate", true] }, 1, 0] } },
};

function startOfTashkentDay(ms: number): number {
  const shifted = ms + TZ_OFFSET_MS;
  return shifted - (shifted % DAY_MS) - TZ_OFFSET_MS;
}

export function periodStart(period: ReportPeriod, now = Date.now()): Date | null {
  if (period === "all") return null;
  return new Date(startOfTashkentDay(now) - (Number(period) - 1) * DAY_MS);
}

export function tashkentDateKey(ms: number): string {
  return new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

function counts(row: Partial<Counts> | undefined): Counts {
  return { ...EMPTY, ...(row ?? {}) };
}

type Group<K> = Partial<Counts> & { _id: K };

interface FacetResult {
  totals: Array<Partial<Counts> & { first: Date }>;
  bySource: Array<Group<"facebook" | "form" | "api">>;
  byDay: Array<Group<string>>;
  byForm: Array<
    Group<{ source: "facebook" | "form" | "api"; form: unknown; crm: mongoose.Types.ObjectId | null }> & {
      last: Date;
      formName?: string | null;
      webFormName?: string | null;
      integration?: mongoose.Types.ObjectId | null;
    }
  >;
  byCrm: Array<Group<mongoose.Types.ObjectId | null>>;
  byUtm: Array<{
    _id: { source?: string | null; medium?: string | null; campaign?: string | null };
    total: number;
    success: number;
  }>;
  errors: Array<{ _id: string; total: number; last: Date }>;
}

export async function getLeadReport(userId: string, period: ReportPeriod): Promise<LeadReport> {
  const since = periodStart(period);
  const match: Record<string, unknown> = { user: new mongoose.Types.ObjectId(userId) };
  if (since) match.createdAt = { $gte: since };

  const [facet] = await Lead.aggregate<FacetResult>([
    { $match: match },
    {
      $facet: {
        totals: [{ $group: { _id: null, ...COUNT_ACCUMULATORS, first: { $min: "$createdAt" } } }],
        bySource: [{ $group: { _id: "$source", ...COUNT_ACCUMULATORS } }],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: REPORT_TIMEZONE } },
              ...COUNT_ACCUMULATORS,
            },
          },
        ],
        byForm: [
          {
            $group: {
              _id: {
                source: "$source",
                form: { $cond: [{ $eq: ["$source", "facebook"] }, "$formId", "$webForm"] },
                crm: "$targetConnection",
              },
              ...COUNT_ACCUMULATORS,
              last: { $max: "$createdAt" },
              formName: { $max: "$formName" },
              webFormName: { $max: "$webFormName" },
              integration: { $max: "$integration" },
            },
          },
          { $sort: { total: -1, last: -1 } },
          { $limit: 100 },
        ],
        byCrm: [{ $group: { _id: "$targetConnection", ...COUNT_ACCUMULATORS } }, { $sort: { total: -1 } }],
        byUtm: [
          { $match: { source: "form" } },
          {
            $group: {
              _id: { source: "$utm.source", medium: "$utm.medium", campaign: "$utm.campaign" },
              total: { $sum: 1 },
              success: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
            },
          },
          { $sort: { total: -1 } },
          { $limit: 15 },
        ],
        errors: [
          { $match: { status: "failed", errorMessage: { $exists: true, $ne: null } } },
          { $group: { _id: "$errorMessage", total: { $sum: 1 }, last: { $max: "$createdAt" } } },
          { $sort: { total: -1, last: -1 } },
          { $limit: 5 },
        ],
      },
    },
  ]);

  const totals = counts(facet.totals[0]);

  // Names are looked up by id so a renamed form/CRM shows its current name,
  // falling back to the name stored on the lead when the original is gone.
  const crmIds = new Set<string>();
  const webFormIds = new Set<string>();
  const integrationIds = new Set<string>();
  for (const row of facet.byForm) {
    if (row._id.crm) crmIds.add(row._id.crm.toString());
    if (row._id.source === "form" && row._id.form) webFormIds.add(String(row._id.form));
    if (row._id.source === "facebook" && row.integration) integrationIds.add(row.integration.toString());
  }
  for (const row of facet.byCrm) if (row._id) crmIds.add(row._id.toString());

  const [connections, webForms, integrations] = await Promise.all([
    Connection.find({ _id: { $in: [...crmIds] } }).select("label platform"),
    WebForm.find({ _id: { $in: [...webFormIds] } }).select("name"),
    Integration.find({ _id: { $in: [...integrationIds] } }).select("formName"),
  ]);
  const connectionById = new Map(connections.map((c) => [c._id.toString(), c]));
  const webFormName = new Map(webForms.map((f) => [f._id.toString(), f.name]));
  const integrationFormName = new Map(integrations.map((i) => [i._id.toString(), i.formName]));

  const crmInfo = (id: mongoose.Types.ObjectId | null) => {
    const connection = id ? connectionById.get(id.toString()) : undefined;
    return { label: connection?.label ?? null, platform: connection?.platform ?? null, known: Boolean(connection) };
  };

  const byForm: FormRow[] = facet.byForm.map((row) => {
    const crm = crmInfo(row._id.crm);
    let formLabel: string | null = null;
    if (row._id.source === "form") {
      formLabel = (row._id.form ? webFormName.get(String(row._id.form)) : undefined) || row.webFormName || null;
    } else if (row._id.source === "facebook") {
      formLabel =
        row.formName ||
        (row.integration ? integrationFormName.get(row.integration.toString()) : undefined) ||
        (row._id.form ? String(row._id.form) : null);
    }
    return {
      ...counts(row),
      source: row._id.source,
      formLabel,
      crmLabel: crm.label,
      crmPlatform: crm.platform,
      last: row.last,
    };
  });

  const byCrm: CrmRow[] = facet.byCrm.map((row) => {
    const crm = crmInfo(row._id);
    return { ...counts(row), label: crm.label, platform: crm.platform };
  });

  // Days with no leads are filled in so the chart's time axis is continuous.
  const chartDays =
    period === "all"
      ? Math.min(
          MAX_CHART_DAYS,
          totals.total > 0 && facet.totals[0]?.first
            ? Math.floor((startOfTashkentDay(Date.now()) - startOfTashkentDay(facet.totals[0].first.getTime())) / DAY_MS) + 1
            : 1,
        )
      : Number(period);
  const dayCounts = new Map(facet.byDay.map((d) => [d._id, counts(d)]));
  const today = startOfTashkentDay(Date.now());
  const byDay: DayPoint[] = [];
  for (let i = chartDays - 1; i >= 0; i--) {
    const date = tashkentDateKey(today - i * DAY_MS);
    byDay.push({ date, ...(dayCounts.get(date) ?? EMPTY) });
  }

  return {
    totals,
    bySource: facet.bySource
      .map((s) => ({ ...counts(s), source: s._id }))
      .sort((a, b) => b.total - a.total),
    byDay,
    byForm,
    byCrm,
    byUtm: facet.byUtm.map((u) => ({
      source: u._id.source ?? null,
      medium: u._id.medium ?? null,
      campaign: u._id.campaign ?? null,
      total: u.total,
      success: u.success,
    })),
    errors: facet.errors.map((e) => ({ message: e._id, total: e.total, last: e.last })),
  };
}
