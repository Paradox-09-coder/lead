import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { Order } from "@/models/Order";
import { getSessionUserId } from "@/lib/server-session";
import { getT } from "@/i18n/server";
import { formatSom, getCurrentPlan, getMonthlyLeadCount } from "@/lib/plans";
import { StatusBadge } from "@/components/StatusBadge";

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
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  const statusCounts = Object.fromEntries(perStatus.map((row) => [row._id, row.count])) as Record<string, number>;
  const totalLeads = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
  const delivered = statusCounts.success ?? 0;
  const deliveryRate = totalLeads > 0 ? Math.round((delivered / totalLeads) * 100) : 0;

  const usagePercent = plan.quota ? Math.min(100, Math.round((monthlyLeads / plan.quota) * 100)) : 0;

  const tiles = [
    { label: t("finance.tilePaidTotal"), value: formatSom(paidTotal) },
    { label: t("finance.tilePendingTotal"), value: formatSom(pendingTotal) },
    { label: t("finance.tileLeadsTotal"), value: totalLeads.toLocaleString("en-US") },
    { label: t("finance.tileDeliveryRate"), value: totalLeads > 0 ? `${deliveryRate}%` : "—" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("finance.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("finance.subtitle")}</p>

      <div className="mt-6 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">{tile.label}</p>
            <p className="mt-2 text-2xl font-semibold">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">{t("finance.planLabel")}</p>
          <p className="mt-1 font-semibold">{t(`pricing.tier.${plan.id}Name`)}</p>
          <p className="mt-1 text-xs text-muted">
            {plan.quota
              ? t("finance.planQuotaMonth", { count: plan.quota.toLocaleString("en-US") })
              : t("finance.planQuotaUnlimited")}
            {plan.expiresAt && <> · {plan.expiresAt.toLocaleDateString(localeTag)} {t("orders.until")}</>}
          </p>
          <div className="mt-4 h-2 rounded-full bg-surface-hover overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${usagePercent}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {t("finance.planUsage", {
              used: monthlyLeads.toLocaleString("en-US"),
              quota: plan.quota ? ` / ${plan.quota.toLocaleString("en-US")}` : "",
            })}
          </p>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">{t("finance.chartTitle", { days: DAYS })}</p>
          <div className="mt-4 flex items-end gap-1.5 h-32">
            {days.map((day) => (
              <div key={dayKey(day.date)} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  title={`${day.date.toLocaleDateString(localeTag)}: ${day.count}`}
                  className="w-full rounded-t bg-primary/80 min-h-[2px]"
                  style={{ height: `${(day.count / maxCount) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted">
            <span>{days[0].date.toLocaleDateString(localeTag)}</span>
            <span>{days[DAYS - 1].date.toLocaleDateString(localeTag)}</span>
          </div>
        </div>
      </div>

      <h2 className="mt-10 font-semibold">{t("finance.paymentsHistory")}</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-muted">{t("finance.noPayments")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border text-muted">
                <th className="py-2 px-4 font-medium">{t("orders.colDate")}</th>
                <th className="py-2 px-4 font-medium">{t("orders.colPlan")}</th>
                <th className="py-2 px-4 font-medium">{t("orders.colAmount")}</th>
                <th className="py-2 px-4 font-medium">{t("orders.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id.toString()} className="border-b border-border last:border-0">
                  <td className="py-3 px-4 whitespace-nowrap text-muted">
                    {(order.paidAt ?? order.createdAt).toLocaleString(localeTag)}
                  </td>
                  <td className="py-3 px-4">{t(`pricing.tier.${order.planId}Name`)}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{formatSom(order.amount)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
