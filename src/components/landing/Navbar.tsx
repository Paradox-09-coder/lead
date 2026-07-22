"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

const NAV_LINKS = [
  { href: "#xizmatlar", label: "Xizmatlar" },
  { href: "#qanday-ishlaydi", label: "Qanday ishlaydi" },
  { href: "#narxlar", label: "Narxlar" },
];

const LANGUAGES = [
  { code: "uz", label: "O'zbekcha" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
];

export function Navbar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [language, setLanguage] = useState(LANGUAGES[0]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold text-lg">LeadSync</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsLangOpen((open) => !open)}
              className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors px-2 py-1.5 rounded-md"
            >
              {language.code.toUpperCase()}
              <ChevronDown className="size-3.5" />
            </button>
            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-surface shadow-xl py-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang);
                      setIsLangOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover transition-colors"
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/login"
            className="text-sm px-3 py-2 rounded-md text-muted hover:text-foreground transition-colors"
          >
            Kirish
          </Link>
          <Link
            href="/register"
            className="text-sm px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white font-medium transition-colors"
          >
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </div>

        <button
          onClick={() => setIsMobileOpen((open) => !open)}
          className="md:hidden p-2 rounded-md hover:bg-surface-hover"
          aria-label="Menyu"
        >
          {isMobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {isMobileOpen && (
        <div className="md:hidden border-t border-border px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-muted">
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/login" className="text-sm px-4 py-2 rounded-md border border-border text-center">
              Kirish
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 rounded-md bg-primary text-white text-center font-medium"
            >
              Ro&apos;yxatdan o&apos;tish
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
