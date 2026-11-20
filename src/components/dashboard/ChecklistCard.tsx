"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/glass";
import { cx } from "@/lib/cx";
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
    <Card
      icon={ListChecks}
      tile="orange"
      title={t("dashboardHome.checklistTitle")}
      subtitle={t("dashboardHome.checklistSub", { count: remaining })}
    >
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="pressable flex items-center justify-between rounded-[16px] border border-line bg-surface px-4 py-3 hover:bg-surface-hover"
          >
            <span className={cx("flex items-center gap-2.5 text-sm font-medium", item.done && "text-ink-3 line-through")}>
              {item.done ? <CheckCircle2 className="size-4 text-good" /> : <Circle className="size-4 text-ink-3" />}
              {t(item.key)}
            </span>
            <ChevronRight className="size-4 text-ink-3" />
          </Link>
        ))}
      </div>
    </Card>
  );
}
