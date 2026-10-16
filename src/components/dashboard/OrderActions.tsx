"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/client";

async function send(url: string, init: RequestInit): Promise<string | null> {
  const response = await fetch(url, init);
  if (response.ok) return null;
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  return body.message ?? null;
}

export function OrderPlanButton({ planId, disabled }: { planId: string; disabled?: boolean }) {
  const router = useRouter();
  const { t } = useT();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsBusy(true);
    setError(null);
    const message = await send("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    setError(message ?? (message === null ? null : t("common.error")));
    setIsBusy(false);
    if (!message) router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isBusy || disabled}
        className="w-full rounded-md bg-primary hover:bg-primary-hover text-white py-2 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {isBusy ? t("orders.orderSending") : t("orders.orderBtn")}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function OrderRowActions({ orderId, isAdmin }: { orderId: string; isAdmin: boolean }) {
  const router = useRouter();
  const { t } = useT();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(status: "paid" | "cancelled") {
    setIsBusy(true);
    setError(null);
    const message = await send(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setError(message);
    setIsBusy(false);
    if (!message) router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      {isAdmin && (
        <button
          onClick={() => update("paid")}
          disabled={isBusy}
          className="text-xs rounded-md bg-success/15 text-success px-2.5 py-1 hover:bg-success/25 transition-colors disabled:opacity-50"
        >
          {t("orders.markPaid")}
        </button>
      )}
      <button
        onClick={() => update("cancelled")}
        disabled={isBusy}
        className="text-xs rounded-md border border-border px-2.5 py-1 hover:bg-surface-hover transition-colors disabled:opacity-50"
      >
        {t("orders.cancel")}
      </button>
    </div>
  );
}
