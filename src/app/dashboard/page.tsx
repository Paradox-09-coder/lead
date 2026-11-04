import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { ChecklistCard } from "@/components/dashboard/ChecklistCard";
import { StatTile } from "@/components/dashboard/StatTile";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import type { ActivityItem } from "@/lib/mock-data";
import { getT } from "@/i18n/server";
import { getSessionUserId } from "@/lib/server-session";
import { getCurrentPlan, getMonthlyLeadCount } from "@/lib/plans";
import { getHomeStats, type HomeStats } from "@/lib/dashboard-stats";
import { leadSourceKey } from "@/lib/public-lead";
import { REPORT_TIMEZONE } from "@/lib/reports";
import { connectDB } from "@/lib/mongodb";

const EMPTY_STATS: HomeStats = {
  today: { total: 0, delivered: 0 },
  week: { total: 0, delivered: 0 },
  month: { total: 0, delivered: 0 },
  recent: [],
  hasAccountConnection: false,
  hasIntegration: false,
};

export default async function DashboardHomePage() {
  const { t, locale } = await getT();

  const userId = await getSessionUserId();
  if (userId) await connectDB();
  const [plan, monthlyLeads, stats] = userId
    ? await Promise.all([getCurrentPlan(userId), getMonthlyLeadCount(userId), getHomeStats(userId)])
    : [null, 0, EMPTY_STATS];

  const quota = plan?.quota ?? null;
  const usagePercent = quota ? Math.min(100, Math.round((monthlyLeads / quota) * 100)) : 0;

  const localeTag = locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";
  const formatTime = (date: Date) =>
    date.toLocaleString(localeTag, {
      timeZone: REPORT_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const periods = [
    { icon: Calendar, labelKey: "dashboardHome.statToday", stat: stats.today },
    { icon: CalendarDays, labelKey: "dashboardHome.statWeek", stat: stats.week },
    { icon: CalendarRange, labelKey: "dashboardHome.statMonth", stat: stats.month },
  ];

  const activity: ActivityItem[] = stats.recent.map((lead) => {
    const source = t(leadSourceKey(lead.source));
    return {
      id: lead.id,
      title: lead.name || lead.phone || t("leadTempo.unnamed"),
      subtitle: lead.formName ? `${source} · ${lead.formName}` : source,
      time: formatTime(lead.createdAt),
      status: lead.status,
      href: `/dashboard/lead-tempo/${lead.id}`,
    };
  });

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold">{t("dashboardHome.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("dashboardHome.subtitle")}</p>
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChecklistCard
            hasAccountConnection={stats.hasAccountConnection}
            hasIntegration={stats.hasIntegration}
          />

          <div className="grid sm:grid-cols-3 gap-4">
            {periods.map(({ icon, labelKey, stat }) => (
              <StatTile
                key={labelKey}
                icon={icon}
                label={t(labelKey)}
                value={stat.total.toLocaleString("en-US")}
                trend={t("dashboardHome.statDelivered", { count: stat.delivered.toLocaleString("en-US") })}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">{t("dashboardHome.planLabel")}</p>
          <p className="mt-1 font-semibold">{plan ? t(`pricing.tier.${plan.id}Name`) : t("dashboardHome.planFree")}</p>
          <p className="mt-1 text-xs text-muted">
            {quota ? t("dashboardHome.planQuota", { quota: quota.toLocaleString("en-US") }) : "—"}
          </p>
          <div className="mt-4 h-2 rounded-full bg-surface-hover overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${usagePercent}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {t("dashboardHome.planUsage", {
              used: monthlyLeads.toLocaleString("en-US"),
              total: quota ? quota.toLocaleString("en-US") : "∞",
            })}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ActivityFeed items={activity} />
      </div>
    </div>
  );
}
