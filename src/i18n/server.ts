import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { translate } from "./dict";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

// Server-side `t()`: reads the locale cookie once per request.
export async function getT(): Promise<{
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
}> {
  const locale = await getLocale();
  return {
    locale,
    t: (key, params) => translate(locale, key, params),
  };
}
