import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { Order } from "@/models/Order";
import { getSessionUserId } from "@/lib/server-session";
import { getT } from "@/i18n/server";
import { formatSom, getCurrentPlan, getMonthlyLeadCount } from "@/lib/plans";
import { Banknote, ChartColumn, Clock, Gauge, Inbox, Receipt, Send } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/dashboard/StatTile";
import { Card, EmptyState, Meter, PageHeader, type TileColor } from "@/components/ui/glass";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";

const DAYS = 14;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function FinancePage() {
  const { t, locale } = await getT();
  const localeTag = locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";

  const userId = await getSessionUserId();
  if (!userId) return null;

  await connectDB();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));

  const [plan, monthlyLeads, orders, perDay, perStatus] = await Promise.all([
    getCurrentPlan(userId),
    getMonthlyLeadCount(userId),
    Order.find({ user: userId }).sort({ createdAt: -1 }),
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: { user: userObjectId, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: { user: userObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const paidTotal = orders.filter((o) => o.status === "paid").reduce((sum, o) => sum + o.amount, 0);
  const pendingTotal = orders.filter((o) => o.status === "pending").reduce((sum, o) => sum + o.amount, 0);

  const counts = new Map(perDay.map((row) => [row._id, row.count]));
  const days = Array.from({ length: DAYS }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + index);
    return { date, count: counts.get(dayKey(date)) ?? 0 };
  });

  const statusCounts = Object.fromEntries(perStatus.map((row) => [row._id, row.count])) as Record<string, number>;
  const totalLeads = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
  const delivered = statusCounts.success ?? 0;
  const deliveryRate = totalLeads > 0 ? Math.round((delivered / totalLeads) * 100) : 0;

  const usagePercent = plan.quota ? Math.min(100, Math.round((monthlyLeads / plan.quota) * 100)) : 0;

  const tiles: { label: string; value: string; icon: typeof Banknote; tile: TileColor }[] = [
    { label: t("finance.tilePaidTotal"), value: formatSom(paidTotal), icon: Banknote, tile: "green" },
    { label: t("finance.tilePendingTotal"), value: formatSom(pendingTotal), icon: Clock, tile: "orange" },
    { label: t("finance.tileLeadsTotal"), value: totalLeads.toLocaleString("en-US"), icon: Inbox, tile: "blue" },
    { label: t("finance.tileDeliveryRate"), value: totalLeads > 0 ? `${deliveryRate}%` : "—", icon: Send, tile: "teal" },
  ];

  return (
    <div>
      <PageHeader title={t("finance.title")} subtitle={t("finance.subtitle")} />

      <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} tile={tile.tile} icon={tile.icon} label={tile.label} value={tile.value} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          icon={Gauge}
          tile="accent"
          title={t(`pricing.tier.${plan.id}Name`)}
          subtitle={t("finance.planLabel")}
          className="self-start"
        >
          <p className="text-xs text-ink-3">
            {plan.quota
              ? t("finance.planQuotaMonth", { count: plan.quota.toLocaleString("en-US") })
              : t("finance.planQuotaUnlimited")}
            {plan.expiresAt && <> · {plan.expiresAt.toLocaleDateString(localeTag)} {t("orders.until")}</>}
          </p>
          <Meter value={usagePercent / 100} className="mt-4" />
          <p className="num mt-2 text-xs text-ink-2">
            {t("finance.planUsage", {
              used: monthlyLeads.toLocaleString("en-US"),
              quota: plan.quota ? ` / ${plan.quota.toLocaleString("en-US")}` : "",
            })}
          </p>
        </Card>

        <Card title={t("finance.chartTitle", { days: DAYS })} icon={ChartColumn} tile="blue" className="lg:col-span-2">
          <SimpleBarChart
            categories={days.map((day) => day.date.toLocaleDateString(localeTag, { day: "2-digit", month: "2-digit" }))}
            tooltipTitles={days.map((day) => day.date.toLocaleDateString(localeTag))}
            values={days.map((day) => day.count)}
            seriesName={t("finance.tileLeadsTotal")}
            height={190}
            ariaLabel={t("finance.chartTitle", { days: DAYS })}
          />
        </Card>
      </div>

      <div className="mt-4">
        <Card title={t("finance.paymentsHistory")} icon={Receipt} tile="purple" dense flush>
          {orders.length === 0 ? (
            <EmptyState icon={Receipt} title={t("finance.noPayments")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("orders.colDate")}</th>
                    <th>{t("orders.colPlan")}</th>
                    <th>{t("orders.colAmount")}</th>
                    <th>{t("orders.colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id.toString()}>
                      <td className="text-ink-3">{(order.paidAt ?? order.createdAt).toLocaleString(localeTag)}</td>
                      <td>{t(`pricing.tier.${order.planId}Name`)}</td>
                      <td>{formatSom(order.amount)}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
