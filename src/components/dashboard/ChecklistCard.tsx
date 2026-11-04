"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { useT } from "@/i18n/client";

// The first-run checklist. Each step shows as done once the account really has
// that thing; the card disappears when every step is done.
export function ChecklistCard({
  hasAccountConnection,
  hasIntegration,
}: {
  hasAccountConnection: boolean;
  hasIntegration: boolean;
}) {
  const { t } = useT();
  const items = [
    { href: "/dashboard/connections", key: "dashboardHome.checklistConnect", done: hasAccountConnection },
    { href: "/dashboard/integrations", key: "dashboardHome.checklistIntegration", done: hasIntegration },
  ];
  const remaining = items.filter((item) => !item.done).length;
  if (remaining === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="font-semibold">{t("dashboardHome.checklistTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("dashboardHome.checklistSub", { count: remaining })}</p>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 hover:bg-surface-hover transition-colors"
          >
            <span className={`flex items-center gap-2.5 text-sm ${item.done ? "text-muted line-through" : ""}`}>
              {item.done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted" />}
              {t(item.key)}
            </span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
