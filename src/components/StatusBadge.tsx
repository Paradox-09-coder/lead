"use client";

import { useT } from "@/i18n/client";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
  pending: "bg-warning/15 text-warning",
  saved: "bg-primary/15 text-primary",
  paid: "bg-success/15 text-success",
  cancelled: "bg-surface-hover text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useT();
  const label = t(`status.${status}`);
  // When the dict has no match, translate() returns the key — fall back to raw.
  const display = label === `status.${status}` ? status : label;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-surface-hover text-muted"
      }`}
    >
      {display}
    </span>
  );
}
