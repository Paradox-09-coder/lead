import crypto from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { TelegramLinkCode } from "@/models/TelegramLinkCode";
import { miniAppUrl, sendTelegramMessage, type InlineKeyboard } from "@/lib/telegram-api";

// What the bot does with the messages Telegram delivers to the webhook:
//   /start        -> tells the person their Telegram ID and whether it is linked
//   /start <code> -> links this Telegram account to the LeadSync account that
//                    asked for <code> on the website (Settings -> Telegram)
// Anything else gets the same information as /start.

export interface TelegramMessageFrom {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramUpdate {
  update_id?: number;
  message?: {
    chat?: { id: number; type?: string };
    from?: TelegramMessageFrom;
    text?: string;
  };
}

type Lang = "uz" | "ru" | "en";

const TEXTS: Record<
  Lang,
  {
    hello: (name: string) => string;
    justLinked: string;
    linked: (email: string) => string;
    notLinked: string;
    language: string;
    open: string;
    codeInvalid: string;
    takenByOther: string;
  }
> = {
  uz: {
    hello: (name) => `👋 Salom, ${name}!`,
    justLinked: "✅ Telegram LeadSync hisobingizga ulandi.",
    linked: (email) => `✅ Hisobingiz ulangan: <b>${email}</b>`,
    notLinked:
      "Hisobingiz LeadSync'ga ulanmagan. Ulash uchun saytda <b>Sozlamalar → Telegram</b> bo'limiga kiring va «Telegram'ni ulash» tugmasini bosing.",
    language: "Til",
    open: "LeadSync'ni ochish",
    codeInvalid:
      "Kod noto'g'ri yoki muddati tugagan. Saytdagi <b>Sozlamalar → Telegram</b> bo'limidan yangi kod oling.",
    takenByOther: "Bu Telegram akkaunt boshqa LeadSync hisobiga ulangan. Avval o'sha hisobdan uzing.",
  },
  ru: {
    hello: (name) => `👋 Привет, ${name}!`,
    justLinked: "✅ Telegram привязан к вашему аккаунту LeadSync.",
    linked: (email) => `✅ Аккаунт привязан: <b>${email}</b>`,
    notLinked:
      "Ваш аккаунт не привязан к LeadSync. Чтобы привязать, откройте на сайте <b>Настройки → Telegram</b> и нажмите «Привязать Telegram».",
    language: "Язык",
    open: "Открыть LeadSync",
    codeInvalid:
      "Код неверный или истёк. Получите новый код на сайте в разделе <b>Настройки → Telegram</b>.",
    takenByOther: "Этот аккаунт Telegram привязан к другому аккаунту LeadSync. Сначала отвяжите его там.",
  },
  en: {
    hello: (name) => `👋 Hi, ${name}!`,
    justLinked: "✅ Telegram is now linked to your LeadSync account.",
    linked: (email) => `✅ Account linked: <b>${email}</b>`,
    notLinked:
      "Your account isn't linked to LeadSync. To link it, open <b>Settings → Telegram</b> on the website and press “Link Telegram”.",
    language: "Language",
    open: "Open LeadSync",
    codeInvalid: "The code is wrong or has expired. Get a new one on the website under <b>Settings → Telegram</b>.",
    takenByOther: "This Telegram account is linked to another LeadSync account. Unlink it there first.",
  },
};

const sha256 = (text: string) => crypto.createHash("sha256").update(text).digest("hex");

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// "ali@example.com" -> "a***@example.com": enough to recognise the account.
const maskEmail = (email: string) => email.replace(/^(.).*(@.*)$/, "$1***$2");

function langOf(code: string | undefined): Lang {
  if (code?.startsWith("ru")) return "ru";
  if (code?.startsWith("en")) return "en";
  return "uz";
}

// Telegram only accepts https addresses on a Web App button.
function openButton(lang: Lang): InlineKeyboard | undefined {
  const url = miniAppUrl();
  if (!url.startsWith("https://")) return undefined;
  return { inline_keyboard: [[{ text: TEXTS[lang].open, web_app: { url } }]] };
}

async function sendInfo(from: TelegramMessageFrom, chatId: number, lang: Lang, justLinked = false) {
  const text = TEXTS[lang];
  const user = await User.findOne({ telegramId: String(from.id) }).select("email");

  const lines = [text.hello(escapeHtml(from.first_name || from.username || "")).replace(/, !$/, "!")];
  if (justLinked) lines.push("", text.justLinked);
  lines.push("", `🆔 Telegram ID: <code>${from.id}</code>`);
  if (from.username) lines.push(`👤 Username: @${escapeHtml(from.username)}`);
  if (from.language_code) lines.push(`🌐 ${text.language}: ${escapeHtml(from.language_code)}`);
  lines.push("", user ? text.linked(escapeHtml(maskEmail(user.email))) : text.notLinked);

  await sendTelegramMessage(chatId, lines.join("\n"), { keyboard: openButton(lang) });
}

async function linkWithCode(code: string, from: TelegramMessageFrom, chatId: number, lang: Lang) {
  const text = TEXTS[lang];
  const invalid = () => sendTelegramMessage(chatId, text.codeInvalid);

  if (!/^[0-9a-f]{32}$/.test(code)) return invalid();

  // One use only: the code is gone the moment it is taken, valid or not.
  const record = await TelegramLinkCode.findOneAndDelete({ codeHash: sha256(code), expiresAt: { $gt: new Date() } });
  if (!record) return invalid();
  const user = await User.findById(record.user);
  if (!user) return invalid();

  const telegramId = String(from.id);
  const taken = await User.exists({ telegramId, _id: { $ne: user._id } });
  if (taken) return sendTelegramMessage(chatId, text.takenByOther);

  try {
    await User.updateOne({ _id: user._id }, { telegramId });
  } catch (error) {
    // The same Telegram account was linked elsewhere in the meantime (unique index).
    if ((error as { code?: number }).code === 11000) return sendTelegramMessage(chatId, text.takenByOther);
    throw error;
  }
  return sendInfo(from, chatId, lang, true);
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  const from = message?.from;
  // Only private chats with a person, and only text.
  if (!message || !from || message.chat?.type !== "private" || typeof message.text !== "string") return;

  const chatId = message.chat.id;
  const lang = langOf(from.language_code);
  const start = message.text.trim().match(/^\/start(?:@\w+)?(?:\s+(\S+))?/i);

  await connectDB();
  if (start?.[1]) {
    await linkWithCode(start[1], from, chatId, lang);
  } else {
    await sendInfo(from, chatId, lang);
  }
}
