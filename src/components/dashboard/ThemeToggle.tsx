"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useT } from "@/i18n/client";

// Preference is "system" (follow the OS), "light" or "dark". It lives in localStorage under the same key the inline
// script in app/layout.tsx reads before first paint, so the page never flashes the wrong theme.
type ThemePref = "system" | "light" | "dark";

const STORAGE_KEY = "ls-theme";
const CHANGE_EVENT = "ls-theme-change";
const ORDER: ThemePref[] = ["system", "light", "dark"];

function readPref(): ThemePref {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const ICONS: Record<ThemePref, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };
const LABEL_KEYS: Record<ThemePref, string> = {
  system: "topbar.themeSystem",
  light: "topbar.themeLight",
  dark: "topbar.themeDark",
};

/** One button that cycles system → light → dark. */
export function ThemeToggle() {
  const { t } = useT();
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref);

  // The OS theme can change while "system" is selected.
  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [pref]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the theme still switches for this page view.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  const Icon = ICONS[pref];
  const label = `${t("topbar.theme")}: ${t(LABEL_KEYS[pref])}`;
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="pressable inline-grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      <Icon aria-hidden size={18} strokeWidth={2} />
    </button>
  );
}
