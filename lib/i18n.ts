import type { Language } from "@/lib/preferences";
import enMessages from "@/locales/en.yml";
import thMessages from "@/locales/th.yml";

export type Locale = "en" | "th";

export type TranslationKey =
  | "todo"
  | "calendar"
  | "list_view"
  | "calendar_view"
  | "filter"
  | "submission_status"
  | "submitted"
  | "not_submitted"
  | "assignment_type"
  | "assignment"
  | "quiz"
  | "group_type"
  | "individual"
  | "group"
  | "due_date"
  | "posted_date"
  | "sort"
  | "sort_by"
  | "order"
  | "asc"
  | "desc"
  | "hidden"
  | "hidden_items"
  | "clear_all"
  | "class"
  | "section"
  | "no_assignments"
  | "no_assignments_desc"
  | "no_classes"
  | "no_classes_desc"
  | "go_to_classes"
  | "done_not_submitted_yet"
  | "hide_class"
  | "hide_assignment"
  | "tips"
  | "tips_desc"
  | "tips_shortcut"
  | "tips_calendar"
  | "tips_restore"
  | "next_tip"
  | "group_by"
  | "group_by_class"
  | "group_by_due_date"
  | "weekly_view"
  | "monthly_view"
  | "previous_month"
  | "next_month"
  | "go_to_current_month"
  | "previous_week"
  | "next_week"
  | "go_to_current_week"
  | "more"
  | "today"
  | "tomorrow"
  | "settings"
  | "language"
  | "language_auto"
  | "language_en"
  | "language_th"
  | "language_desc"
  | "time_format"
  | "time_format_desc"
  | "time_format_12h"
  | "time_format_24h"
  | "keyboard_shortcut"
  | "keyboard_shortcut_desc"
  | "shortcut"
  | "hidden_items_desc"
  | "cleared"
  | "sponsor";

export const EN_MESSAGES = enMessages as Record<TranslationKey, string>;
export const TH_MESSAGES = thMessages as Partial<
  Record<TranslationKey, string>
>;

export function isTranslationKey(key: string): key is TranslationKey {
  return Object.hasOwn(EN_MESSAGES, key);
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
  const isKey = isTranslationKey(key);
  const messages = locale === "th" ? TH_MESSAGES : EN_MESSAGES;
  let text =
    (isKey ? messages[key] : undefined) ??
    (isKey ? EN_MESSAGES[key] : undefined) ??
    key;

  if (substitutions) {
    for (const [token, value] of Object.entries(substitutions)) {
      text = text.replaceAll(`{${token}}`, String(value));
    }
  }

  return text;
}
