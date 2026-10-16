"use client";

import Link from "next/link";
import { Circle, ChevronRight } from "lucide-react";
import { useT } from "@/i18n/client";

const ITEMS = [
  { href: "/dashboard/connections", key: "dashboardHome.checklistConnect" },
  { href: "/dashboard/integrations", key: "dashboardHome.checklistIntegration" },
];

export function ChecklistCard() {
  const { t } = useT();
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="font-semibold">{t("dashboardHome.checklistTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("dashboardHome.checklistSub")}</p>

      <div className="mt-4 space-y-2">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 hover:bg-surface-hover transition-colors"
          >
            <span className="flex items-center gap-2.5 text-sm">
              <Circle className="size-4 text-muted" />
              {t(item.key)}
            </span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
