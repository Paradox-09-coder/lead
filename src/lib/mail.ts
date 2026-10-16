import nodemailer, { type Transporter } from "nodemailer";

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER yoki GMAIL_APP_PASSWORD sozlanmagan");
  }

  cachedTransport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransport;
}

interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail({ to, subject, text, html }: SendMailInput): Promise<void> {
  const transport = getTransport();
  const from = process.env.GMAIL_USER;
  await transport.sendMail({ from: `"LeadSync" <${from}>`, to, subject, text, html });
}

// Renders the password-reset email body in the user's language.
export function renderPasswordResetEmail(code: string, locale: "uz" | "ru" | "en"): {
  subject: string;
  text: string;
  html: string;
} {
  const copy = {
    uz: {
      subject: "LeadSync — parolni almashtirish kodi",
      intro: "Siz LeadSync hisobingiz parolini almashtirishni so'radingiz. Tasdiqlash kodi:",
      note: "Kod 15 daqiqa amal qiladi. Agar bu so'rov sizdan bo'lmasa, xatni e'tiborsiz qoldiring.",
    },
    ru: {
      subject: "LeadSync — код смены пароля",
      intro: "Вы запросили смену пароля в LeadSync. Код подтверждения:",
      note: "Код действителен 15 минут. Если это не вы, просто проигнорируйте письмо.",
    },
    en: {
      subject: "LeadSync — password change code",
      intro: "You requested a password change for your LeadSync account. Confirmation code:",
      note: "The code is valid for 15 minutes. If this wasn't you, just ignore this email.",
    },
  }[locale];

  const text = `${copy.intro}\n\n${code}\n\n${copy.note}\n\n— LeadSync`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 12px;font-size:18px">LeadSync</h2>
      <p style="margin:0 0 16px">${copy.intro}</p>
      <p style="margin:0 0 16px;font-size:28px;letter-spacing:4px;font-weight:700;background:#f5f5f8;border-radius:8px;padding:16px;text-align:center">${code}</p>
      <p style="margin:0;color:#666;font-size:13px">${copy.note}</p>
    </div>
  `.trim();
  return { subject: copy.subject, text, html };
}
