import type { Language } from "@/lib/preferences";
import enMessages from "@/locales/en.yml";
import thMessages from "@/locales/th.yml";

export type Locale = "en" | "th";

export const EN_MESSAGES = enMessages;
export const TH_MESSAGES = thMessages;

export type TranslationKey = keyof typeof EN_MESSAGES;

export function isTranslationKey(key: string): key is TranslationKey {
  return key in EN_MESSAGES;
}

export function resolveLocale(lang: Language, systemLanguage?: string): Locale {
  if (lang === "en" || lang === "th") {
    return lang;
  }
  const sys = systemLanguage ?? globalThis.navigator?.language ?? "en";
  return sys.toLowerCase().startsWith("th") ? "th" : "en";
}

let activeLocale: Locale = globalThis.navigator?.language
  ?.toLowerCase()
  .startsWith("th")
  ? "th"
  : "en";

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function translate(
  key: string,
  locale: Locale,
  substitutions?: Record<string, string | number>
): string {
  const messages = locale === "th" ? TH_MESSAGES : EN_MESSAGES;
  let text =
    (isTranslationKey(key) ? messages[key] : undefined) ??
    EN_MESSAGES[key] ??
    key;

  if (substitutions) {
    for (const [token, value] of Object.entries(substitutions)) {
      text = text.replaceAll(`{${token}}`, String(value));
    }
  }

  return text;
}
