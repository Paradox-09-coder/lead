import { NextRequest } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getTelegramBotToken, verifyTelegramInitData } from "@/lib/telegram";
import { jsonWithSession } from "@/lib/session-response";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

// POST /api/auth/telegram/link { initData, email, password } — links the
// Telegram account that opened the Mini App to a LeadSync account, after the
// owner proves it with their password, and signs them in. From then on the
// Mini App signs in on its own.
export async function POST(request: NextRequest) {
  try {
    const botToken = getTelegramBotToken();
    if (!botToken) {
      return localizedJson({ message: "Telegram sozlanmagan" }, { status: 503 });
    }

    const { initData, email, password } = (await request.json().catch(() => ({}))) as {
      initData?: unknown;
      email?: unknown;
      password?: unknown;
    };
    const telegramUser =
      typeof initData === "string"
        ? verifyTelegramInitData(initData, botToken, undefined, undefined, (rejected) =>
            console.warn("[telegram] Mini App sign-in refused:", JSON.stringify(rejected)),
          )
        : null;
    if (!telegramUser) {
      return localizedJson({ message: "Telegram ma'lumotlari yaroqsiz, ilovani qayta oching" }, { status: 401 });
    }
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return localizedJson({ message: "email va password to'ldirilishi shart" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    const isMatch = user ? await user.comparePassword(password) : false;
    if (!user || !isMatch) {
      return localizedJson({ message: "Email yoki parol noto'g'ri" }, { status: 401 });
    }

    // One Telegram account belongs to one LeadSync account.
    const owner = await User.exists({ telegramId: telegramUser.id, _id: { $ne: user._id } });
    if (owner) {
      return localizedJson({ message: "Bu Telegram akkaunt boshqa hisobga ulangan" }, { status: 409 });
    }

    try {
      await User.updateOne({ _id: user._id }, { telegramId: telegramUser.id });
    } catch (error) {
      // Another request linked the same Telegram account first (unique index).
      if ((error as { code?: number }).code === 11000) {
        return localizedJson({ message: "Bu Telegram akkaunt boshqa hisobga ulangan" }, { status: 409 });
      }
      throw error;
    }
    return jsonWithSession(user, { status: "ok" });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
