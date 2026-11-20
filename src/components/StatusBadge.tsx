"use client";

import { useT } from "@/i18n/client";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-mint/70 text-mint-ink",
  failed: "bg-danger-soft text-danger",
  pending: "bg-warm-soft text-warm",
  saved: "bg-primary-soft text-primary-strong",
  paid: "bg-mint/70 text-mint-ink",
  cancelled: "bg-surface-2 text-ink-2",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useT();
  const label = t(`status.${status}`);
  // When the dict has no match, translate() returns the key — fall back to raw.
  const display = label === `status.${status}` ? status : label;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
        STATUS_STYLES[status] ?? "bg-surface-2 text-ink-2"
      }`}
    >
      {display}
    </span>
  );
}
