"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/client";

export function RetryButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { t } = useT();
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setIsRetrying(true);
    setError(null);
    try {
      const response = await fetch(`/api/leads/${leadId}/retry`, { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? t("leadTempo.retryError"));
      }
      router.refresh();
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-hover transition-colors disabled:opacity-50"
      >
        {isRetrying ? t("leadTempo.retrySending") : t("leadTempo.retrySend")}
      </button>
      {error && <span className="text-xs text-danger max-w-56 text-right">{error}</span>}
    </div>
  );
}
