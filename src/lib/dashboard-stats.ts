import mongoose from "mongoose";
import { Lead, type LeadSource, type LeadStatus } from "@/models/Lead";
import { Connection } from "@/models/Connection";
import { Integration } from "@/models/Integration";
import { startOfTashkentDay, startOfTashkentMonth } from "@/lib/reports";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PeriodStat {
  total: number;
  delivered: number;
}

export interface RecentLead {
  id: string;
  name: string | null;
  phone: string | null;
  source: LeadSource;
  formName: string | null;
  status: LeadStatus;
  createdAt: Date;
}

export interface HomeStats {
  today: PeriodStat;
  week: PeriodStat;
  month: PeriodStat;
  recent: RecentLead[];
  hasAccountConnection: boolean; // a Facebook account is connected
  hasIntegration: boolean;
}

export async function getHomeStats(userId: string): Promise<HomeStats> {
  const now = Date.now();
  const todayStart = new Date(startOfTashkentDay(now));
  const weekStart = new Date(startOfTashkentDay(now) - 6 * DAY_MS);
  const monthStart = new Date(startOfTashkentMonth(now));
  const earliest = weekStart < monthStart ? weekStart : monthStart;

  const inRange = (from: Date) => ({ $gte: ["$createdAt", from] });
  const counts = (key: string, from: Date) => ({
    [key]: { $sum: { $cond: [inRange(from), 1, 0] } },
    [`${key}Delivered`]: {
      $sum: { $cond: [{ $and: [inRange(from), { $eq: ["$status", "success"] }] }, 1, 0] },
    },
  });

  const user = new mongoose.Types.ObjectId(userId);
  const [aggregate, recent, accountConnection, integration] = await Promise.all([
    Lead.aggregate<Record<string, number>>([
      { $match: { user, createdAt: { $gte: earliest } } },
      {
        $group: {
          _id: null,
          ...counts("today", todayStart),
          ...counts("week", weekStart),
          ...counts("month", monthStart),
        },
      },
    ]),
    Lead.find({ user }).sort({ createdAt: -1 }).limit(10),
    Connection.exists({ user, platform: "facebook" }),
    Integration.exists({ user }),
  ]);

  const row = aggregate[0] ?? {};
  const stat = (key: string): PeriodStat => ({ total: row[key] ?? 0, delivered: row[`${key}Delivered`] ?? 0 });

  return {
    today: stat("today"),
    week: stat("week"),
    month: stat("month"),
    recent: recent.map((lead) => ({
      id: lead._id.toString(),
      name: lead.fields?.name ?? null,
      phone: lead.fields?.phone ?? null,
      source: lead.source,
      formName: lead.webFormName ?? lead.formName ?? null,
      status: lead.status,
      createdAt: lead.createdAt,
    })),
    hasAccountConnection: Boolean(accountConnection),
    hasIntegration: Boolean(integration),
  };
}
