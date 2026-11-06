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

// Returns the Telegram user the `initData` belongs to, or null when the data is
// malformed, was not signed with `botToken`, or is too old.
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
  nowMs = Date.now(),
): TelegramUser | null {
  if (!initData || initData.length > MAX_INIT_DATA_LENGTH) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null;
  params.delete("hash");

  // Every field except `hash` (the Ed25519 `signature` field included), sorted by key.
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest();
  const actual = Buffer.from(hash, "hex");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  const ageSeconds = nowMs / 1000 - authDate;
  if (ageSeconds > maxAgeSeconds || ageSeconds < -CLOCK_SKEW_SECONDS) return null;

  let user: unknown;
  try {
    user = JSON.parse(params.get("user") ?? "");
  } catch {
    return null;
  }
  if (typeof user !== "object" || user === null) return null;
  const { id, first_name, last_name, username, language_code } = user as Record<string, unknown>;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return null;

  return {
    id: String(id),
    firstName: typeof first_name === "string" ? first_name : "",
    lastName: typeof last_name === "string" ? last_name : undefined,
    username: typeof username === "string" ? username : undefined,
    languageCode: typeof language_code === "string" ? language_code : undefined,
  };
}
