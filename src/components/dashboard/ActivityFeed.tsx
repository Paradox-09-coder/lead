import { Inbox } from "lucide-react";
import type { ActivityItem } from "@/lib/mock-data";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="font-semibold">So&apos;nggi voqealar</h2>
      <p className="mt-1 text-sm text-muted">Deyarli 10 ta bo&apos;limda</p>

      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center text-center py-6">
          <Inbox className="size-8 text-muted" />
          <p className="mt-2 text-sm text-muted">Hozircha voqealar yo&apos;q</p>
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
