"use client";

import Link from "next/link";
import { Activity, Inbox } from "lucide-react";
import type { ActivityItem } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, EmptyState } from "@/components/ui/glass";
import { useT } from "@/i18n/client";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const { t } = useT();
  return (
    <Card
      icon={Activity}
      tile="pink"
      title={t("dashboardHome.activityTitle")}
      subtitle={t("dashboardHome.activitySub")}
      dense
      actions={
        items.length > 0 ? (
          <Link
            href="/dashboard/lead-tempo"
            className="pressable rounded-full px-3 py-1.5 text-sm font-semibold text-primary-strong hover:bg-primary-soft"
          >
            {t("dashboardHome.activityAll")}
          </Link>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyState icon={Inbox} title={t("dashboardHome.activityEmpty")} />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href ?? "/dashboard/lead-tempo"}
                className="-mx-2 flex items-center justify-between gap-3 rounded-[14px] px-2 py-2.5 text-sm transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{item.title}</span>
                  {item.subtitle && <span className="block truncate text-xs text-ink-3">{item.subtitle}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {item.status && <StatusBadge status={item.status} />}
                  <span className="num whitespace-nowrap text-xs text-ink-3">{item.time}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
