"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { useT } from "@/i18n/client";

interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary";

// Uzbek numbers are the common case, so the country code is pre-filled; it
// stays editable for visitors from elsewhere.
const PHONE_PREFIX = "+998 ";

export function PublicLeadForm({ slug, title, utm }: { slug: string; title: string; utm: Utm }) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(PHONE_PREFIX);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSending(true);
    try {
      const response = await fetch(`/api/f/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, website, utm }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? t("webForms.publicError"));
      }
      setIsSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("webForms.publicError"));
    } finally {
      setIsSending(false);
    }
  }

  if (isSent) {
    return (
      <div className="flex flex-col items-center text-center py-6">
        <CheckCircle2 className="size-10 text-success" />
        <p className="mt-3 font-medium">{t("webForms.publicThanksTitle")}</p>
        <p className="mt-1 text-sm text-muted">{t("webForms.publicThanksSub")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{t("webForms.publicSubtitle")}</p>
      </div>
      <div>
        <label className="block text-sm font-medium">{t("webForms.publicName")}</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={100}
          autoComplete="name"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">{t("webForms.publicPhone")}</label>
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          maxLength={30}
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          inputMode="tel"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">
          {t("webForms.publicEmail")} <span className="text-muted font-normal">{t("webForms.optional")}</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={100}
          autoComplete="email"
          className={INPUT_CLASS}
        />
      </div>
      {/* Honeypot — hidden from people, filled in by naive bots. */}
      <input
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isSending}
        className="w-full rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-2.5 text-sm font-medium transition-colors"
      >
        {isSending ? t("webForms.publicSending") : t("webForms.publicSubmit")}
      </button>
    </form>
  );
}
