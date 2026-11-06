"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MockDataProvider } from "@/components/dashboard/MockDataContext";

interface DashboardUser {
  fullName?: string;
  email?: string;
}

export function DashboardShell({ children, user }: { children: ReactNode; user?: DashboardUser }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <MockDataProvider>
      <div className="min-h-screen flex">
        <Sidebar className="hidden md:flex sticky top-0 h-screen overflow-y-auto" />

        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setIsMobileNavOpen(false)} />
            {/* Solid backdrop: the sidebar's own background is translucent, so without it the page shows through the drawer. */}
            <div className="absolute inset-y-0 left-0 w-64 bg-background shadow-2xl">
              <div className="relative h-full">
                <Sidebar className="flex h-full" />
                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="absolute top-5 right-3 p-1.5 rounded-md hover:bg-surface-hover"
                  aria-label="Yopish"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onMenuClick={() => setIsMobileNavOpen(true)} user={user} />
          <main className="flex-1 px-4 sm:px-6 py-6">{children}</main>
        </div>
      </div>
    </MockDataProvider>
  );
}
