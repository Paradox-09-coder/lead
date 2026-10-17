import { NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import crypto from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PasswordResetCode } from "@/models/PasswordResetCode";
import { getSessionUserId } from "@/lib/server-session";
import { getLocale } from "@/i18n/server";
import { renderPasswordResetEmail, sendMail } from "@/lib/mail";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

const CODE_TTL_MS = 15 * 60 * 1000;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Issues a one-time code and emails it to the signed-in user. Any older code
// for them is cleared first — only the latest one can be used.
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return localizedJson({ message: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    const code = String(crypto.randomInt(100_000, 1_000_000));
    await PasswordResetCode.deleteMany({ user: user._id });
    await PasswordResetCode.create({
      user: user._id,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    const locale = await getLocale();
    const mail = renderPasswordResetEmail(code, locale);
    await sendMail({ to: user.email, ...mail });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
