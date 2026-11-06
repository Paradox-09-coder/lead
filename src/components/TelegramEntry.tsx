"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { RefreshCw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useT } from "@/i18n/client";

// The part of Telegram's Mini App SDK (telegram-web-app.js) used here.
interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  disableVerticalSwipes?(): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

// --background in globals.css: Telegram's header and the page behind the app match it.
const APP_BACKGROUND = "#0a0e1a";

type Phase = "waiting" | "signingIn" | "unlinked" | "outside" | "error";

interface AuthBody {
  status?: string;
  firstName?: string;
  message?: string;
}

async function postJson(url: string, payload: unknown): Promise<{ ok: boolean; body: AuthBody }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as AuthBody;
  return { ok: response.ok, body };
}

// Entry point of the Telegram Mini App (the bot's menu button opens /telegram).
// Telegram's signed `initData` identifies the user; a Telegram account that is
// already linked to a LeadSync account goes straight to the dashboard, a new
// one links itself once with its email and password.
export function TelegramEntry() {
  const router = useRouter();
  const { t } = useT();
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const initData = useRef("");

  const enterDashboard = useCallback(() => {
    router.replace("/dashboard");
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!sdkLoaded) return;
    let cancelled = false;

    async function signIn() {
      const webApp = window.Telegram?.WebApp;
      if (!webApp?.initData) {
        setPhase("outside");
        return;
      }
      initData.current = webApp.initData;
      try {
        webApp.ready();
        webApp.expand();
        webApp.setHeaderColor?.(APP_BACKGROUND);
        webApp.setBackgroundColor?.(APP_BACKGROUND);
        // Scrolling the dashboard must not close the app.
        webApp.disableVerticalSwipes?.();
      } catch {
        // Older Telegram versions lack some of these; the app works without them.
      }

      setPhase("signingIn");
      try {
        const { ok, body } = await postJson("/api/auth/telegram", { initData: initData.current });
        if (cancelled) return;
        if (!ok) {
          setError(body.message ?? t("telegram.errorTitle"));
          setPhase("error");
        } else if (body.status === "ok") {
          enterDashboard();
        } else {
          setFirstName(body.firstName ?? "");
          setPhase("unlinked");
        }
      } catch {
        if (cancelled) return;
        setError(t("telegram.errorTitle"));
        setPhase("error");
      }
    }

    void signIn();
    return () => {
      cancelled = true;
    };
  }, [sdkLoaded, attempt, enterDashboard, t]);

  async function handleLink(event: FormEvent) {
    event.preventDefault();
    setLinkError(null);
    setIsLinking(true);
    try {
      const { ok, body } = await postJson("/api/auth/telegram/link", {
        initData: initData.current,
        email,
        password,
      });
      if (!ok) {
        setLinkError(body.message ?? t("telegram.errorTitle"));
        return;
      }
      enterDashboard();
    } catch {
      setLinkError(t("telegram.errorTitle"));
    } finally {
      setIsLinking(false);
    }
  }

  function retry() {
    setError(null);
    setPhase("waiting");
    setAttempt((value) => value + 1);
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={() => setSdkLoaded(true)}
        onError={() => {
          setError(t("telegram.errorTitle"));
          setPhase("error");
        }}
      />

      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo />
          <span className="font-semibold text-lg">LeadSync</span>
        </div>

        {(phase === "waiting" || phase === "signingIn") && (
          <p className="flex items-center justify-center gap-2 text-sm text-muted">
            <RefreshCw className="size-4 animate-spin" />
            {t("telegram.connecting")}
          </p>
        )}

        {phase === "outside" && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <h1 className="text-lg font-semibold">{t("telegram.outsideTitle")}</h1>
            <p className="mt-2 text-sm text-muted">{t("telegram.outsideSub")}</p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-md bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-sm font-medium transition-colors"
            >
              {t("telegram.outsideLogin")}
            </Link>
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <h1 className="text-lg font-semibold">{t("telegram.errorTitle")}</h1>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            <button
              onClick={retry}
              className="mt-5 rounded-md bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-sm font-medium transition-colors"
            >
              {t("telegram.retry")}
            </button>
          </div>
        )}

        {phase === "unlinked" && (
          <div className="rounded-xl border border-border bg-surface p-6">
            {firstName && <p className="text-sm text-muted text-center">{t("telegram.greeting", { name: firstName })}</p>}
            <h1 className="mt-1 text-lg font-semibold text-center">{t("telegram.linkTitle")}</h1>
            <p className="mt-2 text-sm text-muted text-center">{t("telegram.linkSub")}</p>

            <form onSubmit={handleLink} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium" htmlFor="tg-email">
                  {t("auth.email")}
                </label>
                <input
                  id="tg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="tg-password">
                  {t("auth.password")}
                </label>
                <input
                  id="tg-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
                />
              </div>

              {linkError && <p className="text-sm text-danger">{linkError}</p>}

              <button
                type="submit"
                disabled={isLinking}
                className="w-full rounded-md bg-primary hover:bg-primary-hover text-white py-2.5 font-medium transition-colors disabled:opacity-50"
              >
                {isLinking ? t("telegram.linking") : t("telegram.linkSubmit")}
              </button>
            </form>

            <p className="mt-4 text-xs text-muted text-center">{t("telegram.googleNote")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
