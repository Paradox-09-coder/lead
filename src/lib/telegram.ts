import crypto from "node:crypto";

// Telegram Mini App ("Web App") sign-in helpers. When the dashboard is opened
// from the bot, Telegram hands the page a signed `initData` string; the server
// proves it came from Telegram by recomputing its HMAC with the bot token.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

export interface TelegramUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

const MAX_INIT_DATA_LENGTH = 8192;
// How old `auth_date` may be. A Mini App launch always carries a fresh value; the
// window only matters for a page that is reloaded long after it was opened.
const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;
const CLOCK_SKEW_SECONDS = 60;

export function getTelegramBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export type InitDataCheck =
  | { user: TelegramUser }
  // Why the data was refused. Logged on the server, never sent to the page.
  | { reason: "malformed" | "bad_signature" | "expired" | "bad_user"; ageSeconds?: number; fields?: string[] };

// Checks the `initData` string: it must be well formed, signed with `botToken`
// and recent. The data of a Mini App window that was opened before the bot's
// token was changed fails here as "bad_signature": Telegram signs with the token
// of the moment the window was opened.
export function checkTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
  nowMs = Date.now(),
): InitDataCheck {
  if (!initData || initData.length > MAX_INIT_DATA_LENGTH) return { reason: "malformed" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return { reason: "malformed" };
  params.delete("hash");

  // The data-check-string is every received field except `hash`, sorted by key.
  // Telegram's documentation does not say whether the newer Ed25519 `signature`
  // field belongs in it, so both are accepted: each one is an HMAC under the bot
  // token, which nobody else has, so accepting either lets nothing forged through.
  const sorted = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const candidates = [sorted];
  if (params.has("signature")) candidates.push(sorted.filter(([key]) => key !== "signature"));

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const actual = Buffer.from(hash, "hex");
  const matches = candidates.some((fields) => {
    const dataCheckString = fields.map(([key, value]) => `${key}=${value}`).join("\n");
    const expected = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest();
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  });
  if (!matches) return { reason: "bad_signature", fields: sorted.map(([key]) => key) };

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || authDate <= 0) return { reason: "malformed" };
  const ageSeconds = Math.round(nowMs / 1000 - authDate);
  if (ageSeconds > maxAgeSeconds || ageSeconds < -CLOCK_SKEW_SECONDS) return { reason: "expired", ageSeconds };

  let user: unknown;
  try {
    user = JSON.parse(params.get("user") ?? "");
  } catch {
    return { reason: "bad_user" };
  }
  if (typeof user !== "object" || user === null) return { reason: "bad_user" };
  const { id, first_name, last_name, username, language_code } = user as Record<string, unknown>;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return { reason: "bad_user" };

  return {
    user: {
      id: String(id),
      firstName: typeof first_name === "string" ? first_name : "",
      lastName: typeof last_name === "string" ? last_name : undefined,
      username: typeof username === "string" ? username : undefined,
      languageCode: typeof language_code === "string" ? language_code : undefined,
    },
  };
}

// Returns the Telegram user the `initData` belongs to, or null when it is not valid.
// Pass `onReject` to learn why (for logging).
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
  nowMs = Date.now(),
  onReject?: (check: Exclude<InitDataCheck, { user: TelegramUser }>) => void,
): TelegramUser | null {
  const check = checkTelegramInitData(initData, botToken, maxAgeSeconds, nowMs);
  if ("user" in check) return check.user;
  onReject?.(check);
  return null;
}

// The secret Telegram sends back in the `X-Telegram-Bot-Api-Secret-Token` header
// of every webhook call, so the webhook route can tell Telegram from anyone else.
// Derived from SESSION_SECRET: it stays the same when the bot token is changed
// (the registration made with it keeps working) and needs no setting of its own.
export function telegramWebhookSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update("leadsync:telegram-webhook").digest("hex");
}

export function isTelegramWebhookSecret(provided: string): boolean {
  const expected = telegramWebhookSecret();
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
