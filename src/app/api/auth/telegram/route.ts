import { NextRequest, NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getTelegramBotToken, verifyTelegramInitData } from "@/lib/telegram";
import { jsonWithSession } from "@/lib/session-response";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

// POST /api/auth/telegram { initData } — signs in a user who opened the
// dashboard as a Telegram Mini App. Telegram's signature proves who they are;
// if that Telegram account is not linked to a LeadSync account yet, the page is
// told so and asks for the email and password once (see ./link).
export async function POST(request: NextRequest) {
  try {
    const botToken = getTelegramBotToken();
    if (!botToken) {
      return localizedJson({ message: "Telegram sozlanmagan" }, { status: 503 });
    }

    const { initData } = (await request.json().catch(() => ({}))) as { initData?: unknown };
    const telegramUser =
      typeof initData === "string"
        ? verifyTelegramInitData(initData, botToken, undefined, undefined, (rejected) =>
            console.warn("[telegram] Mini App sign-in refused:", JSON.stringify(rejected)),
          )
        : null;
    if (!telegramUser) {
      return localizedJson({ message: "Telegram ma'lumotlari yaroqsiz, ilovani qayta oching" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ telegramId: telegramUser.id });
    if (!user) {
      return NextResponse.json({ status: "unlinked", firstName: telegramUser.firstName });
    }
    return jsonWithSession(user, { status: "ok" });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
