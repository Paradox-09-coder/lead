"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import type { ActivityItem } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { useT } from "@/i18n/client";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const { t } = useT();
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("dashboardHome.activityTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("dashboardHome.activitySub")}</p>
        </div>
        {items.length > 0 && (
          <Link href="/dashboard/lead-tempo" className="shrink-0 text-sm text-primary hover:underline">
            {t("dashboardHome.activityAll")}
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center text-center py-6">
          <Inbox className="size-8 text-muted" />
          <p className="mt-2 text-sm text-muted">{t("dashboardHome.activityEmpty")}</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href ?? "/dashboard/lead-tempo"}
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-surface-hover transition-colors"
              >
                <span className="min-w-0">
                  <span className="block truncate">{item.title}</span>
                  {item.subtitle && <span className="block truncate text-xs text-muted">{item.subtitle}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {item.status && <StatusBadge status={item.status} />}
                  <span className="whitespace-nowrap text-xs text-muted">{item.time}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
