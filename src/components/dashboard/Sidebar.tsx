"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  FileText,
  FileInput,
  TrendingUp,
  Webhook,
  Link2,
  KeyRound,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { IconTile, type TileColor } from "@/components/ui/glass";
import { cx } from "@/lib/cx";
import { useT } from "@/i18n/client";

interface NavItem {
  href: string;
  key: string;
  icon: LucideIcon;
  tile: TileColor;
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "sidebar.main",
    items: [
      { href: "/dashboard", key: "sidebar.home", icon: LayoutDashboard, tile: "blue" },
      { href: "/dashboard/integrations", key: "sidebar.integrations", icon: Workflow, tile: "indigo" },
      { href: "/dashboard/forms", key: "sidebar.forms", icon: FileInput, tile: "teal" },
      { href: "/dashboard/reports", key: "sidebar.reports", icon: FileText, tile: "purple" },
      { href: "/dashboard/lead-tempo", key: "sidebar.leadTempo", icon: TrendingUp, tile: "orange" },
      { href: "/dashboard/conversions", key: "sidebar.conversions", icon: Webhook, tile: "pink" },
      // "Moliya tahlili" (finance) sidebardan vaqtincha olib tashlangan —
      // sahifa saqlangan; keyinroq qayta ulash uchun yetarli.
      // "Obuna sotib olish" (orders) sidebardan vaqtincha olib tashlangan —
      // sahifa va API saqlangan; keyinroq qayta ulash uchun yetarli.
    ],
  },
  {
    titleKey: "sidebar.resources",
    items: [
      { href: "/dashboard/connections", key: "sidebar.connections", icon: Link2, tile: "green" },
      { href: "/dashboard/api-keys", key: "sidebar.apiKeys", icon: KeyRound, tile: "yellow" },
    ],
  },
  {
    titleKey: "sidebar.account",
    items: [{ href: "/dashboard/settings", key: "sidebar.settings", icon: Settings, tile: "gray" }],
  },
];

/** The nav item whose page the pathname belongs to (longest matching href wins). */
export function activeNavItem(pathname: string): NavItem | undefined {
  const matches = NAV_GROUPS.flatMap((group) => group.items).filter((item) =>
    item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}

// Pages that exist but are not in the sidebar (finance and orders are hidden for now): breadcrumb title only.
const HIDDEN_PAGE_TITLES = [
  { href: "/dashboard/finance", key: "sidebar.finance" },
  { href: "/dashboard/orders", key: "sidebar.orders" },
];

/** Translation key for the current page's title (breadcrumb). */
export function pageTitleKey(pathname: string): string | undefined {
  return (
    activeNavItem(pathname)?.key ?? HIDDEN_PAGE_TITLES.find((page) => pathname.startsWith(page.href))?.key
  );
}

/** Logo + navigation. The shell wraps it in the glass sidebar (desktop) or the drawer (mobile). */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useT();
  const active = activeNavItem(pathname);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-1 pt-1 pb-3">
        <Link href="/dashboard" onClick={onNavigate} className="pressable flex items-center gap-2.5 rounded-2xl">
          <Logo size={34} />
          <span className="text-[1.0625rem] leading-tight font-bold tracking-tight text-ink">LeadSync</span>
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none]">
        {NAV_GROUPS.map((group) => (
          <div key={group.titleKey} className="flex flex-col gap-0.5">
            <p className="eyebrow px-3 pt-4 pb-1">{t(group.titleKey)}</p>
            {group.items.map((item) => {
              const isActive = active?.href === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cx(
                    "group pressable relative flex min-h-[40px] items-center gap-3 rounded-[15px] px-2.5 text-[0.9375rem] font-medium",
                    isActive
                      ? "bg-[var(--lens-bg)] text-ink shadow-[inset_0_1px_0_var(--glass-rim),var(--lens-shadow)]"
                      : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <IconTile icon={item.icon} color={item.tile} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
