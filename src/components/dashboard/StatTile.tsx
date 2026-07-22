import type { LucideIcon } from "lucide-react";

export function StatTile({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <Icon className="size-4 text-muted" />
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {trend && <p className="mt-1 text-xs text-muted">{trend}</p>}
    </div>
  );
}
