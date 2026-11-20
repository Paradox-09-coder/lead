"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/client";

type Variant = "compact" | "icon";

export function LanguageSwitcher({ variant = "compact" }: { variant?: Variant }) {
  const router = useRouter();
  const current = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<Locale | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function selectLocale(locale: Locale) {
    if (locale === current || pending) return;
    setPending(locale);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      setIsOpen(false);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Language"
        className={
          variant === "icon"
            ? "p-2 rounded-full hover:bg-surface-hover text-muted flex items-center gap-1"
            : "flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors px-3 min-h-10 rounded-full"
        }
      >
        {variant === "icon" ? <Globe className="size-4" /> : null}
        <span>{current.toUpperCase()}</span>
        <ChevronDown className="size-3.5" />
      </button>

      {isOpen && (
        <div className="glass-pop absolute right-0 mt-2 w-40 rounded-[18px] p-1.5 z-50">
          {LOCALES.map((locale) => {
            const isActive = locale === current;
            return (
              <button
                key={locale}
                onClick={() => selectLocale(locale)}
                disabled={pending !== null}
                className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm rounded-[12px] hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                <span>{LOCALE_LABELS[locale]}</span>
                {isActive && <Check className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
