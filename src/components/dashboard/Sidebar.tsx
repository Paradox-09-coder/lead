"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  FileText,
  TrendingUp,
  Wallet,
  ShoppingCart,
  Link2,
  Globe,
  KeyRound,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "ASOSIY",
    items: [
      { href: "/dashboard", label: "Bosh sahifa", icon: LayoutDashboard },
      { href: "/dashboard/integrations", label: "Integratsiyalar", icon: Workflow },
      { href: "/dashboard/reports", label: "Hisobotlar", icon: FileText },
      { href: "/dashboard/lead-tempo", label: "Lid tempi", icon: TrendingUp },
      { href: "/dashboard/finance", label: "Moliya tahlili", icon: Wallet },
      { href: "/dashboard/orders", label: "Buyurtmalar", icon: ShoppingCart },
    ],
  },
  {
    title: "RESURSLAR",
    items: [
      { href: "/dashboard/connections", label: "Ulanishlar", icon: Link2 },
      { href: "/dashboard/domains", label: "Domenlar", icon: Globe },
      { href: "/dashboard/api-keys", label: "API Kalitlar", icon: KeyRound },
    ],
  },
  {
    title: "HISOB",
    items: [{ href: "/dashboard/settings", label: "Sozlamalar", icon: Settings }],
  },
];

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();

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
          <div key={group.title}>
            <p className="px-2 mb-1.5 text-[11px] font-medium tracking-wider text-muted">{group.title}</p>
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
                    {item.label}
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
