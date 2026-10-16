import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PasswordResetCode } from "@/models/PasswordResetCode";
import { getSessionUserId } from "@/lib/server-session";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const MIN_PASSWORD = 6;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Verifies the emailed code and sets the new password. Each failed attempt is
// counted — after 5 the code is dropped and the user has to request a new one.
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const { code, newPassword } = (await request.json()) as { code?: string; newPassword?: string };
    if (!code?.trim() || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json({ message: "Kodni to'g'ri kiriting" }, { status: 400 });
    }
    if (!newPassword || newPassword.length < MIN_PASSWORD) {
      return NextResponse.json(
        { message: `Parol kamida ${MIN_PASSWORD} belgidan iborat bo'lishi kerak` },
        { status: 400 },
      );
    }

    await connectDB();
    const record = await PasswordResetCode.findOne({ user: userId });
    if (!record || record.expiresAt < new Date()) {
      if (record) await record.deleteOne();
      return NextResponse.json({ message: "Kod topilmadi yoki muddati tugagan" }, { status: 400 });
    }

    if (record.codeHash !== hashCode(code.trim())) {
      record.attempts += 1;
      if (record.attempts >= MAX_ATTEMPTS) {
        await record.deleteOne();
        return NextResponse.json({ message: "Juda ko'p noto'g'ri urinish, yangi kod so'rang" }, { status: 400 });
      }
      await record.save();
      return NextResponse.json({ message: "Kod noto'g'ri" }, { status: 400 });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return NextResponse.json({ message: "Foydalanuvchi topilmadi" }, { status: 404 });
    }
    user.password = newPassword;
    await user.save();
    await record.deleteOne();

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
