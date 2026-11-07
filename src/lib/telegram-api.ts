import { appBaseUrl } from "@/lib/app-url";
import { getTelegramBotToken, telegramWebhookSecret } from "@/lib/telegram";

// Calls to Telegram's Bot API (https://core.telegram.org/bots/api). The bot
// token is part of the URL, so nothing built from it may reach a log or a
// response: failures are reduced to Telegram's own description.

const TIMEOUT_MS = 10_000;

export class TelegramApiError extends Error {}

export async function callTelegram<T>(method: string, payload?: Record<string, unknown>): Promise<T> {
  const botToken = getTelegramBotToken();
  if (!botToken) throw new TelegramApiError("Telegram sozlanmagan");

  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new TelegramApiError("Telegram'ga ulanib bo'lmadi");
  }
  const body = (await response.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
  if (!response.ok || !body?.ok) {
    throw new TelegramApiError(body?.description ?? `Telegram HTTP ${response.status}`);
  }
  return body.result as T;
}

export interface InlineKeyboard {
  inline_keyboard: Array<Array<{ text: string; web_app?: { url: string }; url?: string }>>;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options: { keyboard?: InlineKeyboard } = {},
): Promise<void> {
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(options.keyboard ? { reply_markup: options.keyboard } : {}),
  });
}

let cachedBotUsername: string | null = null;

// The bot's @username, for t.me links. TELEGRAM_BOT_USERNAME wins when set;
// otherwise Telegram is asked once and the answer kept.
export async function getBotUsername(): Promise<string | null> {
  const configured = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (configured) return configured;
  if (cachedBotUsername) return cachedBotUsername;
  try {
    const me = await callTelegram<{ username?: string }>("getMe");
    cachedBotUsername = me.username ?? null;
  } catch {
    return null;
  }
  return cachedBotUsername;
}

// Where the Mini App opens: the /telegram page of this site.
export function miniAppUrl(): string {
  return `${appBaseUrl()}/telegram`;
}

// Tells Telegram to deliver the bot's messages to /api/telegram/webhook. Safe to
// repeat: it is called on every start of the server, so a new deployment or a
// changed token never leaves the bot without its webhook. Only the public https
// address of a deployed site can be a webhook, so it does nothing otherwise
// (local development).
export async function registerTelegramWebhook(): Promise<"registered" | "skipped"> {
  const secret = telegramWebhookSecret();
  const base = appBaseUrl();
  if (!getTelegramBotToken() || !secret || !base.startsWith("https://")) return "skipped";

  await callTelegram("setWebhook", {
    url: `${base}/api/telegram/webhook`,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
  return "registered";
}
