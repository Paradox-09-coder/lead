import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Lead } from "@/models/Lead";
import { PRICING_TIERS } from "@/lib/mock-data";
import { startOfTashkentMonth } from "@/lib/reports";

// Prices in so'm per month and lead quotas per tier id (the display texts live
// in PRICING_TIERS). `null` quota = unlimited.
const PLAN_LIMITS: Record<string, { amount: number; quota: number | null }> = {
  starter: { amount: 0, quota: 1000 },
  professional: { amount: 49000, quota: 5000 },
  business: { amount: 69000, quota: 10000 },
  enterprise: { amount: 89000, quota: null },
};

export const PLAN_DURATION_DAYS = 30;

export function getPlan(planId: string) {
  const tier = PRICING_TIERS.find((t) => t.id === planId);
  const limits = PLAN_LIMITS[planId];
  if (!tier || !limits) return null;
  return { id: tier.id, name: tier.name, amount: limits.amount, quota: limits.quota };
}

export function formatSom(amount: number): string {
  return `${amount.toLocaleString("en-US")} so'm`;
}

// The active plan is the newest paid order that is still within its 30 days;
// otherwise the free plan.
export async function getCurrentPlan(userId: string) {
  await connectDB();
  const since = new Date(Date.now() - PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const order = await Order.findOne({ user: userId, status: "paid", paidAt: { $gte: since } }).sort({
    paidAt: -1,
  });
  const plan = (order && getPlan(order.planId)) ?? getPlan("starter")!;
  const expiresAt = order?.paidAt
    ? new Date(order.paidAt.getTime() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000)
    : null;
  return { ...plan, expiresAt };
}

export async function getMonthlyLeadCount(userId: string): Promise<number> {
  await connectDB();
  const monthStart = new Date(startOfTashkentMonth(Date.now()));
  return Lead.countDocuments({ user: userId, createdAt: { $gte: monthStart } });
}
