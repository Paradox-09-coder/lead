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
import { useT } from "@/i18n/client";

interface NavItem {
  href: string;
  key: string;
  icon: LucideIcon;
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "sidebar.main",
    items: [
      { href: "/dashboard", key: "sidebar.home", icon: LayoutDashboard },
      { href: "/dashboard/integrations", key: "sidebar.integrations", icon: Workflow },
      { href: "/dashboard/forms", key: "sidebar.forms", icon: FileInput },
      { href: "/dashboard/reports", key: "sidebar.reports", icon: FileText },
      { href: "/dashboard/lead-tempo", key: "sidebar.leadTempo", icon: TrendingUp },
      { href: "/dashboard/conversions", key: "sidebar.conversions", icon: Webhook },
      // "Moliya tahlili" (finance) sidebardan vaqtincha olib tashlangan —
      // sahifa saqlangan; keyinroq qayta ulash uchun yetarli.
      // "Obuna sotib olish" (orders) sidebardan vaqtincha olib tashlangan —
      // sahifa va API saqlangan; keyinroq qayta ulash uchun yetarli.
    ],
  },
  {
    titleKey: "sidebar.resources",
    items: [
      { href: "/dashboard/connections", key: "sidebar.connections", icon: Link2 },
      { href: "/dashboard/api-keys", key: "sidebar.apiKeys", icon: KeyRound },
    ],
  },
  {
    titleKey: "sidebar.account",
    items: [{ href: "/dashboard/settings", key: "sidebar.settings", icon: Settings }],
  },
];

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useT();

  return (
    <aside className={`w-64 shrink-0 border-r border-border bg-surface/50 flex flex-col ${className}`}>
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={26} />
          <span className="font-semibold">LeadSync</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.titleKey}>
            <p className="px-2 mb-1.5 text-[11px] font-medium tracking-wider text-muted">{t(group.titleKey)}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-primary text-white"
                        : "text-muted hover:text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {t(item.key)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
