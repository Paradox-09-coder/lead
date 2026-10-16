import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

// PATCH { status: "cancelled" } — the owner cancels their pending order.
// PATCH { status: "paid" }      — an admin confirms the payment.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session?.userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const { status } = (await request.json()) as { status?: string };
    if (status !== "paid" && status !== "cancelled") {
      return NextResponse.json({ message: "status: paid | cancelled" }, { status: 400 });
    }

    await connectDB();

    // Admin rights come from the database, not from the (client-held) token.
    const isAdmin = status === "paid" && (await User.findById(session.userId))?.role === "admin";
    if (status === "paid" && !isAdmin) {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const order = await Order.findOne(isAdmin ? { _id: id } : { _id: id, user: session.userId });
    if (!order) {
      return NextResponse.json({ message: "Buyurtma topilmadi" }, { status: 404 });
    }
    if (order.status !== "pending") {
      return NextResponse.json({ message: "Faqat kutilayotgan buyurtmani o'zgartirish mumkin" }, { status: 409 });
    }

    order.status = status;
    if (status === "paid") order.paidAt = new Date();
    await order.save();
    return NextResponse.json({ ok: true, status: order.status });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
