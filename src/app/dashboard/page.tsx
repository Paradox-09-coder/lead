import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { ChecklistCard } from "@/components/dashboard/ChecklistCard";
import { StatTile } from "@/components/dashboard/StatTile";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { OVERVIEW_STATS, RECENT_ACTIVITY } from "@/lib/mock-data";

const STAT_ICONS = [Calendar, CalendarDays, CalendarRange];

export default function DashboardHomePage() {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold">Bosh sahifa</h1>
        <p className="mt-1 text-sm text-muted">Sizning biznesingiz statistikasi</p>
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChecklistCard />

          <div className="grid sm:grid-cols-3 gap-4">
            {OVERVIEW_STATS.map((stat, index) => (
              <StatTile key={stat.label} icon={STAT_ICONS[index]} label={stat.label} value={stat.value} trend={stat.trend} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Tarif rejasi</p>
          <p className="mt-1 font-semibold">Bepul</p>
          <p className="mt-1 text-xs text-muted">1,000 ta lid / oy</p>
          <div className="mt-4 h-2 rounded-full bg-surface-hover overflow-hidden">
            <div className="h-full w-0 bg-primary" />
          </div>
          <p className="mt-2 text-xs text-muted">0 / 1,000 ta lid ishlatildi</p>
        </div>
      </div>

      <div className="mt-6">
        <ActivityFeed items={RECENT_ACTIVITY} />
      </div>
    </div>
  );
}
