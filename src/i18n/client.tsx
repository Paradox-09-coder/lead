"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { translate } from "./dict";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

// Client-side `t()`: looks up strings against the locale given by the nearest
// LocaleProvider (set once in the root layout from the server-read cookie).
export function useT(): {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
} {
  const locale = useLocale();
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );
  return { t, locale };
}
