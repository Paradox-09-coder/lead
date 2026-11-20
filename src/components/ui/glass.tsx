import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/lib/cx";

/*
 * Liquid Glass building blocks, ported from Data365 Studio (apps/demo/src/ui/glass.tsx + controls.tsx).
 * Everything here is server-safe (no hooks, no state) so Server Component pages can use it directly.
 * Styles live in app/globals.css and only apply inside the dashboard shell (`.studio-shell`).
 */

export type TileColor =
  | "blue"
  | "orange"
  | "green"
  | "indigo"
  | "purple"
  | "teal"
  | "mint"
  | "pink"
  | "yellow"
  | "gray"
  | "red"
  | "cyan"
  | "accent";

const TILE_SIZES = {
  xs: { box: "h-6 w-6 rounded-[7px]", icon: 13 },
  sm: { box: "h-7 w-7 rounded-[9px]", icon: 15 },
  md: { box: "h-9 w-9 rounded-[11px]", icon: 18 },
  lg: { box: "h-12 w-12 rounded-[15px]", icon: 24 },
} as const;

/** Rounded-square coloured icon chip, like an app icon. */
export function IconTile({
  icon: Icon,
  color,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  color: TileColor;
  size?: keyof typeof TILE_SIZES;
  className?: string;
}) {
  const dims = TILE_SIZES[size];
  return (
    <span aria-hidden className={cx("icon-tile tile-wiggle", `tile-${color}`, dims.box, className)}>
      <Icon size={dims.icon} strokeWidth={2.3} />
    </span>
  );
}

/** Rolling digits (iPhone-counter style) for an already formatted number such as "1,248" or "92%". */
export function Odometer({ text }: { text: string }) {
  let digitIndex = 0;
  return (
    <span className="inline-block whitespace-nowrap tabular-nums" aria-label={text} role="img">
      <span aria-hidden>
        {[...text].map((ch, i) => {
          if (!/[0-9]/.test(ch)) return <span key={i}>{ch}</span>;
          const style = { "--d": Number(ch), "--i": digitIndex++ } as CSSProperties;
          return (
            <span key={i} className="odo-d" style={style}>
              {ch}
            </span>
          );
        })}
      </span>
    </span>
  );
}

/** Page title block: optional eyebrow, big title, subtitle and actions on the right. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[0.875rem] font-medium text-ink-2">{eyebrow}</p>}
        <h1 className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.022em] text-ink sm:text-[2.125rem]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-[0.9375rem] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Glass card with an optional header (icon tile + title + subtitle + actions).
 * `dense` = more opaque glass for tables and long lists; `flush` = no body padding (tables touching the edges).
 */
export function Card({
  title,
  subtitle,
  icon,
  tile = "accent",
  actions,
  children,
  className,
  bodyClassName,
  dense,
  flush,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  tile?: TileColor;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  dense?: boolean;
  flush?: boolean;
}) {
  return (
    <section className={cx("panel flex min-w-0 flex-col", dense && "panel-dense", className)}>
      {(title || actions) && (
        <header className="flex items-center gap-3 px-4 pt-4 pb-3 sm:px-5">
          {icon && <IconTile icon={icon} color={tile} size="sm" />}
          <div className="min-w-0 flex-1">
            {title && <h2 className="truncate text-[0.9375rem] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="truncate text-[0.8125rem] text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div
        className={cx(
          "min-h-0 flex-1",
          !flush && "px-4 pb-4 sm:px-5 sm:pb-5",
          !flush && !(title || actions) && "pt-4 sm:pt-5",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Small rounded label. tone = neutral | good | warn | bad | accent */
export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "good" | "warn" | "bad" | "accent";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2",
    good: "bg-mint/70 text-mint-ink",
    warn: "bg-warm-soft text-warm",
    bad: "bg-danger-soft text-danger",
    accent: "bg-primary-soft text-primary-strong",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Thin progress/share bar. value 0..1, color any CSS colour (defaults to the accent). */
export function Meter({ value, color, className }: { value: number; color?: string; className?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cx("meter", className)} role="presentation">
      <span style={{ "--v": v, "--bar": color } as CSSProperties} />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="mb-1 grid h-14 w-14 place-items-center rounded-[18px] bg-primary-soft text-primary-strong">
        <Icon aria-hidden size={26} />
      </span>
      <p className="text-[1.0625rem] font-semibold text-ink">{title}</p>
      {text && <p className="max-w-sm text-[0.875rem] text-ink-2">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Segmented control made of links (period filters that live in the URL). The active option gets the glass lens. */
export function SegmentedLinks({
  options,
  value,
  label,
  size = "sm",
}: {
  options: { value: string; label: ReactNode; href: string }[];
  value: string;
  label: string;
  size?: "xs" | "sm" | "md";
}) {
  return (
    <nav
      aria-label={label}
      className="relative inline-grid max-w-full auto-cols-max grid-flow-col gap-0.5 overflow-x-auto rounded-full bg-surface-2 p-[3px] [scrollbar-width:none]"
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Link
            key={option.value}
            href={option.href}
            aria-current={on ? "page" : undefined}
            className={cx(
              "pressable inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap",
              size === "xs"
                ? "min-h-[28px] px-2.5 text-[0.75rem]"
                : size === "sm"
                  ? "min-h-[32px] px-3 text-[0.8125rem]"
                  : "min-h-[40px] px-4 text-[0.9375rem]",
              on
                ? "bg-[var(--lens-bg)] text-ink shadow-[inset_0_1px_0_var(--glass-rim),var(--lens-shadow)]"
                : "text-ink-2 hover:text-ink",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Initial in a soft gradient circle. */
export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initial = (name.trim()[0] ?? "L").toLocaleUpperCase();
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_4px_10px_-4px_rgb(0_0_0/0.35)]"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: "linear-gradient(140deg, var(--primary-brand), color-mix(in srgb, var(--primary-brand) 30%, #2bb5a0))",
      }}
    >
      {initial}
    </span>
  );
}
