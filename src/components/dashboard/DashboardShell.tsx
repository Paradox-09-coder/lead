"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MockDataProvider } from "@/components/dashboard/MockDataContext";
import { MotionLayer } from "@/components/dashboard/MotionLayer";
import { Wallpaper } from "@/components/dashboard/Wallpaper";

interface DashboardUser {
  fullName?: string;
  email?: string;
}

/**
 * Data365 Studio shell: pastel wallpaper, floating glass sidebar (drawer on phones), glass top bar.
 * The `studio-shell` class is what switches globals.css to the Liquid Glass look (`html:has(.studio-shell)`).
 */
export function DashboardShell({ children, user }: { children: ReactNode; user?: DashboardUser }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <MockDataProvider>
      <div className="studio-shell min-h-dvh">
        <Wallpaper />
        <MotionLayer />

        <aside className="glass fixed inset-y-3 start-3 z-30 hidden w-[264px] flex-col rounded-[28px] p-3 lg:flex">
          <Sidebar />
        </aside>

        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fade-in absolute inset-0 bg-black/45" onClick={() => setIsMobileNavOpen(false)} />
            <div className="glass-pop absolute inset-y-3 start-3 w-[280px] max-w-[calc(100vw-24px)] rounded-[28px] p-3">
              <div className="relative h-full">
                <Sidebar onNavigate={() => setIsMobileNavOpen(false)} />
                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="pressable absolute top-1 right-0 inline-grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
                  aria-label="Yopish"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="lg:ps-[280px]">
          <Topbar onMenuClick={() => setIsMobileNavOpen(true)} user={user} />
          <main className="mx-auto w-full max-w-[1440px] px-4 pt-5 pb-16 sm:px-6 lg:px-8">
            <div className="page-in">{children}</div>
          </main>
        </div>
      </div>
    </MockDataProvider>
  );
}
