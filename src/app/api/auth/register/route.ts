import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/session";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password } = (await request.json()) as {
      fullName?: string;
      email?: string;
      password?: string;
    };

    if (!fullName || !email || !password) {
      return NextResponse.json({ message: "fullName, email va password to'ldirilishi shart" }, { status: 400 });
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { message: "Bu email bilan foydalanuvchi allaqachon ro'yxatdan o'tgan" },
        { status: 409 },
      );
    }

    const user = await User.create({ fullName, email, password });

    const sessionToken = await createSessionToken({
      role: user.role,
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
    });

    const response = NextResponse.json(
      { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, createdAt: user.createdAt },
      { status: 201 },
    );
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
    return response;
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
