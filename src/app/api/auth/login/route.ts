import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/session";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ message: "email va password to'ldirilishi shart" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    const isMatch = user ? await user.comparePassword(password) : false;

    if (!user || !isMatch) {
      return NextResponse.json({ message: "Email yoki parol noto'g'ri" }, { status: 401 });
    }

    const sessionToken = await createSessionToken({
      role: user.role,
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
    });

    const response = NextResponse.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
    return response;
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
