"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";

interface SyncResult {
  checkedForms: number;
  imported: number;
  problems: { scope: string; message: string }[];
}

// Checks the user's Facebook lead forms for leads LeadSync never received
// (runs once when "Lid tempi" opens, and on demand), then refreshes the list.
export function FacebookSyncBar() {
  const router = useRouter();
  const { t } = useT();
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const response = await fetch("/api/leads/sync", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as SyncResult & { message?: string };
      if (!response.ok) {
        setError(body.message ?? t("leadTempo.syncError"));
        return;
      }
      setResult(body);
      if (body.imported > 0) router.refresh();
    } catch {
      setError(t("leadTempo.syncError"));
    } finally {
      setIsSyncing(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void sync();
  }, [sync]);

  return (
    <div className="mt-4 rounded-lg border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          {isSyncing
            ? t("leadTempo.syncRunning")
            : result
              ? result.checkedForms === 0 && result.problems.length === 0
                ? t("leadTempo.syncNoForms")
                : t("leadTempo.syncDone", { forms: result.checkedForms, imported: result.imported })
              : t("leadTempo.syncHint")}
        </p>
        <button
          onClick={() => void sync()}
          disabled={isSyncing}
          className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-hover transition-colors disabled:opacity-50"
        >
          {isSyncing ? t("leadTempo.syncButtonRunning") : t("leadTempo.syncButton")}
        </button>
      </div>
      {error && <p className="mt-2 text-danger">{error}</p>}
      {result && result.problems.length > 0 && (
        <div className="mt-3 rounded-md border border-danger/30 bg-danger/10 p-3">
          <p className="font-medium text-danger">{t("leadTempo.syncProblemsTitle")}</p>
          <ul className="mt-1 space-y-1 text-danger/90">
            {result.problems.map((problem, index) => (
              <li key={index}>
                <span className="font-medium">{problem.scope}:</span> {problem.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
