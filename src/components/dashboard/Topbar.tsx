"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronRight, LogOut, Menu } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { pageTitleKey } from "@/components/dashboard/Sidebar";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { Avatar } from "@/components/ui/glass";
import { useT } from "@/i18n/client";

interface TopbarUser {
  fullName?: string;
  email?: string;
}

export function Topbar({ onMenuClick, user }: { onMenuClick: () => void; user?: TopbarUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useT();
  const displayName = user?.fullName || user?.email || "Admin";
  const titleKey = pageTitleKey(pathname);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsUserMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsUserMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isUserMenuOpen]);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),8px)] sm:px-4 lg:px-6 lg:pt-3">
      <div className="glass mx-auto flex h-14 max-w-[1440px] items-center gap-2 rounded-[22px] px-2 sm:px-3">
        <button
          onClick={onMenuClick}
          className="pressable inline-grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink lg:hidden"
          aria-label={t("topbar.menu")}
        >
          <Menu className="size-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[0.9375rem]">
          <span className="hidden truncate font-medium text-ink-3 sm:inline">LeadSync</span>
          {titleKey && (
            <>
              <ChevronRight aria-hidden size={14} className="hidden shrink-0 text-ink-3 sm:inline" />
              <span className="truncate font-semibold text-ink">{t(titleKey)}</span>
            </>
          )}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
          <button
            className="pressable inline-grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
            aria-label={t("topbar.notifications")}
          >
            <Bell className="size-[18px]" />
          </button>

          <div ref={menuRef} className="relative ms-1">
            <button
              onClick={() => setIsUserMenuOpen((open) => !open)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              className="pressable flex items-center gap-2 rounded-full ps-1 pe-1 hover:bg-surface-2 sm:pe-3"
            >
              <Avatar name={displayName} size={32} />
              <span className="hidden max-w-[180px] truncate text-[0.875rem] font-semibold text-ink sm:inline">
                {displayName}
              </span>
            </button>

            {isUserMenuOpen && (
              <div
                role="menu"
                className="glass-pop fade-in absolute right-0 z-50 mt-2 w-52 rounded-[18px] p-1.5"
              >
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="pressable flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[0.875rem] font-medium text-ink hover:bg-surface-2 disabled:opacity-50"
                >
                  <LogOut className="size-4" />
                  {t("topbar.logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
