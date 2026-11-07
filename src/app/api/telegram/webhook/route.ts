import { NextRequest, NextResponse } from "next/server";
import { getTelegramBotToken, isTelegramWebhookSecret } from "@/lib/telegram";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram-bot";

export const runtime = "nodejs";

// POST /api/telegram/webhook — Telegram delivers every message sent to the bot
// here. Telegram proves it is the sender with the secret token given when the
// webhook was registered; everything else is turned away.
export async function POST(request: NextRequest) {
  if (!getTelegramBotToken()) {
    return NextResponse.json({ error: "Telegram sozlanmagan" }, { status: 503 });
  }
  if (!isTelegramWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token") ?? "")) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (update) {
    try {
      await handleTelegramUpdate(update);
    } catch (error) {
      // Always answer 200: on any other status Telegram resends the same update
      // again and again, so a bug would turn into a flood.
      console.error("[telegram-webhook] update failed", update.update_id, error instanceof Error ? error.message : error);
    }
  }
  return NextResponse.json({ ok: true });
}
