import type { LucideIcon } from "lucide-react";
import { cx } from "@/lib/cx";
import { IconTile, Odometer, type TileColor } from "@/components/ui/glass";

/**
 * KPI card (Data365 Studio "StatCard"): coloured label and icon tile, big rolling number, a faint large icon in the
 * corner and an optional line underneath. `value` is already formatted ("1,248", "92%").
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  trend,
  tile = "accent",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  tile?: TileColor;
  className?: string;
}) {
  return (
    <div className={cx("panel group relative block overflow-hidden p-4 text-start sm:p-[18px]", `tile-${tile}`, className)}>
      <span className="kpi-glow" aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className="kpi-label text-[0.875rem] leading-tight font-semibold">{label}</p>
        <div className="-me-1 -mt-1">
          <IconTile icon={Icon} color={tile} size="sm" />
        </div>
      </div>
      <p className="mt-2 text-[1.75rem] leading-none font-bold tracking-[-0.025em] text-ink sm:text-[2rem]">
        <Odometer text={value} />
      </p>
      {trend && <p className="mt-2 text-[0.8125rem] text-ink-2">{trend}</p>}
      <Icon aria-hidden className="kpi-mark" strokeWidth={1.6} />
    </div>
  );
}
