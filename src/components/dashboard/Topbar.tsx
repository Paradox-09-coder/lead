"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, LogOut, User } from "lucide-react";

interface TopbarUser {
  fullName?: string;
  email?: string;
}

export function Topbar({ onMenuClick, user }: { onMenuClick: () => void; user?: TopbarUser }) {
  const router = useRouter();
  const displayName = user?.fullName || user?.email || "Admin";
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 shrink-0">
      <button onClick={onMenuClick} className="md:hidden p-2 rounded-md hover:bg-surface-hover" aria-label="Menyu">
        <Menu className="size-5" />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-md hover:bg-surface-hover text-muted" aria-label="Bildirishnomalar">
          <Bell className="size-4.5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-hover transition-colors"
          >
            <span className="size-7 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <User className="size-4" />
            </span>
            <span className="hidden sm:inline text-sm">{displayName}</span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-surface shadow-xl py-1">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                <LogOut className="size-4" />
                Chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
