"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Locale, translations, WEEKDAY_NAMES } from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  weekdays: string[];
  dateLocale: string;
};

const LocaleContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "teamslots_locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") {
      setLocaleState(saved);
    } else if (!navigator.language.toLowerCase().startsWith("zh")) {
      // First visit, no saved preference yet — guess from the browser so
      // an English-speaking invitee doesn't land on a Chinese-only page.
      setLocaleState("en");
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = translations[locale][key] ?? translations.zh[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, String(v));
      }
      return str;
    },
    [locale]
  );

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t, weekdays: WEEKDAY_NAMES[locale], dateLocale: locale === "zh" ? "zh-CN" : "en-US" }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
