"use client";

import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";

const CHECK_EVERY_MS = 60_000;

// The id of the build this browser tab loaded; compared against what the server runs now.
const LOADED_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

// Slides in from the top when a newer version of LeadSync has been deployed
// while this page was open, and asks the visitor to refresh.
export function UpdateBanner() {
  const { t } = useT();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (hasUpdate) return;
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { id?: string };
        if (!cancelled && body.id && body.id !== LOADED_BUILD_ID) setHasUpdate(true);
      } catch {
        // Offline or mid-deploy: try again on the next tick.
      }
    }

    const interval = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hasUpdate]);

  if (!hasUpdate || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-3 pointer-events-none"
    >
      <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-xl border border-primary/40 bg-surface/95 px-4 py-3 shadow-2xl shadow-primary/20 backdrop-blur">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">{t("updateBanner.title")}</p>
          <p className="text-muted">{t("updateBanner.text")}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          {t("updateBanner.refresh")}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t("common.close")}
          className="shrink-0 rounded-md p-1 text-muted transition-colors hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
