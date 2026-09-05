import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import type { ReactNode } from "react";

import { resolveLocale, setActiveLocale, translate } from "@/lib/i18n";
import type { Locale, TranslationKey } from "@/lib/i18n";
import type { Language } from "@/lib/preferences";
import { languageStorage } from "@/lib/storage";
import { useStorageState } from "@/lib/use-storage-state";

export interface I18nContextValue {
  language: Language;
  locale: Locale;
  setLanguage: (lang: Language) => void;
  t: (
    key: TranslationKey,
    substitutions?: Record<string, string | number>
  ) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useStorageState(languageStorage);
  const locale = resolveLocale(language);

  setActiveLocale(locale);

  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, substitutions?: Record<string, string | number>) =>
      translate(key, locale, substitutions),
    [locale]
  );

  const value = useMemo(
    () => ({
      language,
      locale,
      setLanguage,
      t,
    }),
    [language, locale, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
