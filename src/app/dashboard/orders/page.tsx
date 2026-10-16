import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { getSessionUserId } from "@/lib/server-session";
import { getT } from "@/i18n/server";
import { formatSom, getCurrentPlan, getPlan } from "@/lib/plans";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderPlanButton, OrderRowActions } from "@/components/dashboard/OrderActions";

const PAID_PLAN_IDS = ["professional", "business", "enterprise"] as const;

export default async function OrdersPage() {
  const { t, locale } = await getT();
  const localeTag = locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";

  const userId = await getSessionUserId();
  await connectDB();

  const [orders, currentPlan, user] = userId
    ? await Promise.all([
        Order.find({ user: userId }).sort({ createdAt: -1 }).limit(100),
        getCurrentPlan(userId),
        User.findById(userId),
      ])
    : [[], null, null];
  const isAdmin = user?.role === "admin";
  const pendingPlanIds = new Set(orders.filter((o) => o.status === "pending").map((o) => o.planId));

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("orders.title")}</h1>
      <p className="mt-1 text-sm text-muted">
        {t("orders.currentPlan")}{" "}
        <span className="text-foreground font-medium">
          {currentPlan ? t(`pricing.tier.${currentPlan.id}Name`) : "—"}
        </span>
        {currentPlan?.expiresAt && (
          <>
            {" "}
            · {currentPlan.expiresAt.toLocaleDateString(localeTag)} {t("orders.until")}
          </>
        )}
      </p>

      <div className="mt-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {PAID_PLAN_IDS.map((id) => {
          const plan = getPlan(id)!;
          return (
            <div key={id} className="rounded-xl border border-border bg-surface p-5 flex flex-col">
              <p className="font-semibold">{t(`pricing.tier.${id}Name`)}</p>
              <p className="mt-1 text-2xl font-semibold">
                {plan.amount.toLocaleString("en-US")}{" "}
                <span className="text-sm font-normal text-muted">{t("pricing.tier.perMonth")}</span>
              </p>
              <p className="mt-1 text-sm text-muted">
                {plan.quota ? t(`pricing.quota.k${plan.quota / 1000}`) : t("pricing.quota.unlimited")}
              </p>
              <div className="mt-auto pt-4">
                {currentPlan?.id === id ? (
                  <p className="text-sm text-success text-center">{t("orders.isCurrent")}</p>
                ) : (
                  <OrderPlanButton planId={id} disabled={pendingPlanIds.has(id)} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 font-semibold">{t("orders.historyTitle")}</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-muted">{t("orders.empty")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border text-muted">
                <th className="py-2 px-4 font-medium">{t("orders.colDate")}</th>
                <th className="py-2 px-4 font-medium">{t("orders.colPlan")}</th>
                <th className="py-2 px-4 font-medium">{t("orders.colAmount")}</th>
                <th className="py-2 px-4 font-medium">{t("orders.colStatus")}</th>
                <th className="py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id.toString()} className="border-b border-border last:border-0">
                  <td className="py-3 px-4 whitespace-nowrap text-muted">
                    {order.createdAt.toLocaleString(localeTag)}
                  </td>
                  <td className="py-3 px-4">{t(`pricing.tier.${order.planId}Name`)}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{formatSom(order.amount)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-4">
                    {order.status === "pending" && (
                      <OrderRowActions orderId={order._id.toString()} isAdmin={isAdmin} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">{t("orders.footerNote")}</p>
    </div>
  );
}
