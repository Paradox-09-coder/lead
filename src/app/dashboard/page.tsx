import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { ChecklistCard } from "@/components/dashboard/ChecklistCard";
import { StatTile } from "@/components/dashboard/StatTile";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { RECENT_ACTIVITY } from "@/lib/mock-data";
import { getT } from "@/i18n/server";
import { getSessionUserId } from "@/lib/server-session";
import { getCurrentPlan, getMonthlyLeadCount } from "@/lib/plans";

export default async function DashboardHomePage() {
  const { t } = await getT();

  const userId = await getSessionUserId();
  const [plan, monthlyLeads] = userId
    ? await Promise.all([getCurrentPlan(userId), getMonthlyLeadCount(userId)])
    : [null, 0];

  const quota = plan?.quota ?? null;
  const usagePercent = quota ? Math.min(100, Math.round((monthlyLeads / quota) * 100)) : 0;

  const stats = [
    { icon: Calendar, labelKey: "dashboardHome.statToday" },
    { icon: CalendarDays, labelKey: "dashboardHome.statWeek" },
    { icon: CalendarRange, labelKey: "dashboardHome.statMonth" },
  ];

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold">{t("dashboardHome.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("dashboardHome.subtitle")}</p>
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChecklistCard />

          <div className="grid sm:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <StatTile
                key={stat.labelKey}
                icon={stat.icon}
                label={t(stat.labelKey)}
                value="0"
                trend={t("dashboardHome.statLeadsCount", { count: 0 })}
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
        <ActivityFeed items={RECENT_ACTIVITY} />
      </div>
    </div>
  );
}
