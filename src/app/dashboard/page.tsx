import { Calendar, CalendarDays, CalendarRange, ChartColumn, Gauge } from "lucide-react";
import { ChecklistCard } from "@/components/dashboard/ChecklistCard";
import { StatTile } from "@/components/dashboard/StatTile";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Card, Meter, PageHeader, type TileColor } from "@/components/ui/glass";
import { LeadsTrendChart } from "@/components/charts/LeadsTrendChart";
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
  daily: [],
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

  const periods: { icon: typeof Calendar; labelKey: string; stat: HomeStats["today"]; tile: TileColor }[] = [
    { icon: Calendar, labelKey: "dashboardHome.statToday", stat: stats.today, tile: "blue" },
    { icon: CalendarDays, labelKey: "dashboardHome.statWeek", stat: stats.week, tile: "teal" },
    { icon: CalendarRange, labelKey: "dashboardHome.statMonth", stat: stats.month, tile: "indigo" },
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
      <PageHeader title={t("dashboardHome.title")} subtitle={t("dashboardHome.subtitle")} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ChecklistCard
            hasAccountConnection={stats.hasAccountConnection}
            hasIntegration={stats.hasIntegration}
          />

          <div className="stagger grid gap-3 sm:grid-cols-3 sm:gap-4">
            {periods.map(({ icon, labelKey, stat, tile }) => (
              <StatTile
                key={labelKey}
                tile={tile}
                icon={icon}
                label={t(labelKey)}
                value={stat.total.toLocaleString("en-US")}
                trend={t("dashboardHome.statDelivered", { count: stat.delivered.toLocaleString("en-US") })}
              />
            ))}
          </div>
        </div>

        <Card
          icon={Gauge}
          tile="accent"
          title={plan ? t(`pricing.tier.${plan.id}Name`) : t("dashboardHome.planFree")}
          subtitle={t("dashboardHome.planLabel")}
          className="self-start"
        >
          <p className="text-xs text-ink-3">
            {quota ? t("dashboardHome.planQuota", { quota: quota.toLocaleString("en-US") }) : "—"}
          </p>
          <Meter value={usagePercent / 100} className="mt-4" />
          <p className="num mt-2 text-xs text-ink-2">
            {t("dashboardHome.planUsage", {
              used: monthlyLeads.toLocaleString("en-US"),
              total: quota ? quota.toLocaleString("en-US") : "∞",
            })}
          </p>
        </Card>
      </div>

      <div className="mt-4">
        <Card title={t("dashboardHome.trendTitle")} icon={ChartColumn} tile="blue">
          <LeadsTrendChart
            days={stats.daily}
            height={240}
            ariaLabel={t("dashboardHome.trendTitle")}
            labels={{
              delivered: t("reports.legendDelivered"),
              failed: t("reports.legendFailed"),
              waiting: t("reports.legendWaiting"),
              total: t("reports.colTotal"),
            }}
          />
        </Card>
      </div>

      <div className="mt-4">
        <ActivityFeed items={activity} />
      </div>
    </div>
  );
}
