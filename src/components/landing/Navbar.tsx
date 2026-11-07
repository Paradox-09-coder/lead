"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/i18n/client";

export function Navbar() {
  const { t } = useT();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const links = [
    { href: "#xizmatlar", label: t("nav.features") },
    { href: "#qanday-ishlaydi", label: t("nav.howItWorks") },
    { href: "#narxlar", label: t("nav.pricing") },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-background via-background/70 to-transparent">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold text-lg">LeadSync</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="text-sm px-3 py-2 rounded-md text-muted hover:text-foreground transition-colors"
          >
            {t("nav.login")}
          </Link>
          <Link
            href="/register"
            className="text-sm px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white font-medium transition-colors"
          >
            {t("nav.register")}
          </Link>
        </div>

        <button
          onClick={() => setIsMobileOpen((open) => !open)}
          className="md:hidden p-2 rounded-md hover:bg-surface-hover"
          aria-label={isMobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
        >
          {isMobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {isMobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="px-6 py-4 flex flex-col gap-1 text-sm">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileOpen(false)}
                className="py-2 text-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-border mt-2 flex items-center justify-between">
              <LanguageSwitcher />
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm px-3 py-2 rounded-md text-muted hover:text-foreground">
                  {t("nav.login")}
                </Link>
                <Link
                  href="/register"
                  className="text-sm px-3 py-2 rounded-md bg-primary text-white font-medium"
                >
                  {t("nav.register")}
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
