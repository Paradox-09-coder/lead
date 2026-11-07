import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { localizedJson } from "@/i18n/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { TelegramLinkCode } from "@/models/TelegramLinkCode";
import { getSessionUserId } from "@/lib/server-session";
import { getTelegramBotToken } from "@/lib/telegram";
import { getBotUsername } from "@/lib/telegram-api";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

const CODE_TTL_MINUTES = 10;

// GET /api/settings/telegram — is this account linked to a Telegram account?
// (The page polls it while the person is pressing Start in Telegram.)
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(userId).select("telegramId");
  return NextResponse.json({
    configured: Boolean(getTelegramBotToken()),
    linked: Boolean(user?.telegramId),
    telegramId: user?.telegramId ?? null,
  });
}

// POST /api/settings/telegram — a one-time link for the bot. Opening it in
// Telegram and pressing Start links that Telegram account to this one.
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    if (!getTelegramBotToken()) {
      return localizedJson({ message: "Telegram sozlanmagan" }, { status: 503 });
    }
    const username = await getBotUsername();
    if (!username) {
      return localizedJson({ message: "Telegram botiga ulanib bo'lmadi" }, { status: 502 });
    }

    await connectDB();
    // Only the newest code works.
    await TelegramLinkCode.deleteMany({ user: userId });
    const code = crypto.randomBytes(16).toString("hex");
    await TelegramLinkCode.create({
      user: userId,
      codeHash: crypto.createHash("sha256").update(code).digest("hex"),
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    });

    return NextResponse.json({
      url: `https://t.me/${username}?start=${code}`,
      botUsername: username,
      expiresInMinutes: CODE_TTL_MINUTES,
    });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}

// DELETE /api/settings/telegram — unlinks the Telegram account.
export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) {
    return localizedJson({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    await connectDB();
    await User.updateOne({ _id: userId }, { $unset: { telegramId: 1 } });
    await TelegramLinkCode.deleteMany({ user: userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return localizedJson({ message }, { status });
  }
}
