import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { getSessionUserId } from "@/lib/server-session";
import { getPlan } from "@/lib/plans";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

// Creates a pending order for a paid plan. There is no payment gateway yet:
// the order stays "pending" until an admin marks it paid.
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const { planId } = (await request.json()) as { planId?: string };
    const plan = planId ? getPlan(planId) : null;
    if (!plan || plan.amount <= 0) {
      return NextResponse.json({ message: "Tarif topilmadi" }, { status: 400 });
    }

    await connectDB();
    const pending = await Order.findOne({ user: userId, planId: plan.id, status: "pending" });
    if (pending) {
      return NextResponse.json({ message: "Bu tarif uchun buyurtma allaqachon kutilmoqda" }, { status: 409 });
    }

    const order = await Order.create({
      user: userId,
      planId: plan.id,
      planName: plan.name,
      amount: plan.amount,
    });
    return NextResponse.json({ _id: order._id, status: order.status }, { status: 201 });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
