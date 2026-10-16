import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSessionUserId } from "@/lib/server-session";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const { fullName } = (await request.json()) as { fullName?: string };
    const trimmed = fullName?.trim();
    if (!trimmed) {
      return NextResponse.json({ message: "Ismni kiriting" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(userId, { fullName: trimmed }, { new: true });
    if (!user) {
      return NextResponse.json({ message: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    // Session token holds the display name — refresh it so the topbar updates
    // on the next page load.
    const token = await createSessionToken({
      role: user.role,
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
    });
    const response = NextResponse.json({ ok: true, fullName: user.fullName });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
    return response;
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
