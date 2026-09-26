import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { ui } from "../i18n/ui";
import type { Locale } from "../types/content";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const STORAGE_KEY = "articles-locale";

const HTML_LANG: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "pt" || value === "en" || value === "es";
}

function localeFromNavigator(): Locale {
  const language = navigator.language;
  if (language.startsWith("pt")) return "pt";
  if (language.startsWith("es")) return "es";
  return "en";
}

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return localeFromNavigator();
}

function writeLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

function applyDocumentLocale(locale: Locale) {
  document.documentElement.lang = HTML_LANG[locale];
  document.title = ui[locale].site_name ?? ui.en.site_name ?? "site_name";
}

export function LocaleProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(readLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeLocale(next);
  }, []);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const t = useCallback(
    (key: string) => ui[locale][key] ?? ui.en[key] ?? key,
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}
