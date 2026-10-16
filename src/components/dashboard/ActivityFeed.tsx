"use client";

import { Inbox } from "lucide-react";
import type { ActivityItem } from "@/lib/mock-data";
import { useT } from "@/i18n/client";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const { t } = useT();
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="font-semibold">{t("dashboardHome.activityTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("dashboardHome.activitySub")}</p>

      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center text-center py-6">
          <Inbox className="size-8 text-muted" />
          <p className="mt-2 text-sm text-muted">{t("dashboardHome.activityEmpty")}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span>{item.title}</span>
              <span className="text-muted">{item.time}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
