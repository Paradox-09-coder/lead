"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await fetch(`/api/leads/${leadId}/retry`, { method: "POST" });
      router.refresh();
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <button
      onClick={handleRetry}
      disabled={isRetrying}
      className="text-sm rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
    >
      {isRetrying ? "Yuborilmoqda..." : "Qayta urinish"}
    </button>
  );
}
