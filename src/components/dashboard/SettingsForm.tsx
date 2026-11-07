"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, ExternalLink, KeyRound, Mail, Send, User2 } from "lucide-react";
import { useT } from "@/i18n/client";

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

function ProfileSection({ fullName, email }: { fullName: string; email: string }) {
  const router = useRouter();
  const { t } = useT();
  const [name, setName] = useState(fullName);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    setError(null);
    setStatus("idle");
    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name }),
      });
      if (!response.ok) {
        setError(await readMessage(response, t("common.error")));
        setStatus("error");
        return;
      }
      setStatus("saved");
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        <User2 className="size-5 text-primary" />
        <h2 className="font-semibold">{t("settings.profileTitle")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted">{t("settings.profileSub")}</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium">
            {t("settings.fullName")}
          </label>
          <input
            id="fullName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">{t("settings.email")}</label>
          <input
            value={email}
            disabled
            className="mt-1.5 w-full rounded-md border border-border bg-surface-hover text-muted px-3 py-2"
          />
          <p className="mt-1 text-xs text-muted">{t("settings.emailLocked")}</p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {status === "saved" && <p className="text-sm text-success">{t("settings.profileSaved")}</p>}

        <button
          type="submit"
          disabled={isBusy || name.trim() === fullName}
          className="rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isBusy ? t("common.submitting") : t("common.save")}
        </button>
      </form>
    </section>
  );
}

function PasswordSection({ email }: { email: string }) {
  const { t } = useT();
  const [step, setStep] = useState<"idle" | "code" | "done">("idle");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearForm() {
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function requestCode() {
    setIsBusy(true);
    // Each code request starts a fresh form — any leftover input from a
    // previous attempt would otherwise pre-fill the fields.
    clearForm();
    try {
      const response = await fetch("/api/settings/password/request", { method: "POST" });
      if (!response.ok) {
        setError(await readMessage(response, t("common.error")));
        return;
      }
      const body = (await response.json()) as { email: string };
      setSentTo(body.email);
      setStep("code");
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmCode(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6) {
      setError(t("settings.codeTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("settings.passwordMismatch"));
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, newPassword }),
      });
      if (!response.ok) {
        setError(await readMessage(response, t("common.error")));
        return;
      }
      setStep("done");
      clearForm();
    } finally {
      setIsBusy(false);
    }
  }

  function resetFlow() {
    setStep("idle");
    clearForm();
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="size-5 text-primary" />
        <h2 className="font-semibold">{t("settings.passwordTitle")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        {t("settings.passwordSub", { email })}
      </p>

      {step === "idle" && (
        <div className="mt-4">
          <button
            onClick={requestCode}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Mail className="size-4" />
            {isBusy ? t("settings.passwordSending") : t("settings.passwordRequest")}
          </button>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      )}

      {step === "code" && (
        <form onSubmit={confirmCode} className="mt-4 space-y-4">
          <p className="text-sm text-success">
            {t("settings.passwordSent", { email: sentTo ?? email })}
          </p>
          <div>
            <label htmlFor="code" className="block text-sm font-medium">
              {t("settings.codeLabel")}
            </label>
            <input
              id="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-primary tracking-widest text-center font-mono text-lg"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium">
              {t("settings.newPassword")}
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium">
              {t("settings.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isBusy ? t("common.submitting") : t("settings.passwordChange")}
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="text-sm text-muted hover:text-foreground"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      {step === "done" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-success">{t("settings.passwordChanged")}</p>
          <button
            onClick={resetFlow}
            className="text-sm text-muted hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>
      )}
    </section>
  );
}

interface TelegramStatus {
  configured: boolean;
  linked: boolean;
  telegramId: string | null;
}

const LINK_POLL_MS = 3000;

// Links this account to the person's Telegram account. "Link" asks for a
// one-time t.me link; pressing Start in Telegram sends it to the bot, which
// links the accounts, and this section notices by asking the server every few
// seconds.
function TelegramSection() {
  const { t } = useT();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [link, setLink] = useState<{ url: string; expiresInMinutes: number } | null>(null);
  const [justLinked, setJustLinked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/telegram")
      .then((response) => (response.ok ? (response.json() as Promise<TelegramStatus>) : null))
      .then((loaded) => {
        if (!cancelled) setStatus(loaded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // While a link is waiting to be used, check whether Telegram has taken it.
  const waiting = link !== null && status !== null && !status.linked;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      fetch("/api/settings/telegram")
        .then((response) => (response.ok ? (response.json() as Promise<TelegramStatus>) : null))
        .then((loaded) => {
          if (loaded?.linked) {
            setStatus(loaded);
            setLink(null);
            setJustLinked(true);
          }
        })
        .catch(() => {});
    }, LINK_POLL_MS);
    return () => clearInterval(timer);
  }, [waiting]);

  async function startLinking() {
    setIsBusy(true);
    setError(null);
    setJustLinked(false);
    try {
      const response = await fetch("/api/settings/telegram", { method: "POST" });
      if (!response.ok) {
        setError(await readMessage(response, t("settings.telegramError")));
        return;
      }
      setLink((await response.json()) as { url: string; expiresInMinutes: number });
    } finally {
      setIsBusy(false);
    }
  }

  async function unlink() {
    if (!window.confirm(t("settings.telegramUnlinkConfirm"))) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/telegram", { method: "DELETE" });
      if (!response.ok) {
        setError(await readMessage(response, t("common.error")));
        return;
      }
      setStatus((previous) => (previous ? { ...previous, linked: false, telegramId: null } : previous));
      setJustLinked(false);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        <Send className="size-5 text-primary" />
        <h2 className="font-semibold">{t("settings.telegramTitle")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted">{t("settings.telegramSub")}</p>

      {status && !status.configured && (
        <p className="mt-4 text-sm text-warning">{t("settings.telegramNotConfigured")}</p>
      )}

      {status?.configured && status.linked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="size-4 shrink-0" />
              {justLinked ? t("settings.telegramDone") : t("settings.telegramLinked")}
            </p>
            {status.telegramId && (
              <p className="mt-0.5 text-xs text-muted">{t("settings.telegramIdLabel", { id: status.telegramId })}</p>
            )}
          </div>
          <button
            onClick={unlink}
            disabled={isBusy}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-danger disabled:opacity-50"
          >
            {t("settings.telegramUnlink")}
          </button>
        </div>
      )}

      {status?.configured && !status.linked && (
        <div className="mt-4">
          {!link ? (
            <button
              onClick={startLinking}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Send className="size-4" />
              {isBusy ? t("settings.telegramPreparing") : t("settings.telegramLink")}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">{t("settings.telegramStep", { minutes: link.expiresInMinutes })}</p>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors"
              >
                <ExternalLink className="size-4" />
                {t("settings.telegramOpen")}
              </a>
              <p className="text-xs text-muted">{t("settings.telegramWaiting")}</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}

export function SettingsForm({ fullName, email }: { fullName: string; email: string }) {
  return (
    <div className="mt-6 space-y-6">
      <ProfileSection fullName={fullName} email={email} />
      <TelegramSection />
      <PasswordSection email={email} />
    </div>
  );
}
