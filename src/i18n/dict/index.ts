import type { Locale } from "../config";
import { uz, type Dict } from "./uz";
import { ru } from "./ru";
import { en } from "./en";

export const DICTS: Record<Locale, Dict> = { uz, ru, en };

// Resolve a dot-separated path ("hero.badge") against a dict object. The
// result is unknown so callers always string-coerce it; a missing path
// returns null and we fall back to UZ in `translate`.
function lookup(obj: unknown, path: string): unknown {
  let current = obj;
  for (const segment of path.split(".")) {
    if (current == null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return current ?? null;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value == null ? "" : String(value);
  });
}

// Resolves a translation key against the chosen locale. If the key is missing
// there, falls back to UZ. If still missing, returns the key itself so the
// bug is visible in the UI.
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const value = lookup(DICTS[locale], key) ?? lookup(DICTS.uz, key);
  if (typeof value !== "string") return key;
  return interpolate(value, params);
}

export type { Dict };
