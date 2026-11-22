import type { Language } from "@/lib/preferences";
import enMessages from "@/locales/en.yml";
import thMessages from "@/locales/th.yml";

export type Locale = "en" | "th";

export type TranslationKey =
  | "todo"
  | "calendar"
  | "list_view"
  | "calendar_view"
  | "classes"
  | "assignments"
  | "section"
  | "due_date"
  | "no_due_date"
  | "posted_date"
  | "hide_class"
  | "hide_assignment"
  | "today"
  | "tomorrow"
  | "filter"
  | "submission_status"
  | "status_submitted"
  | "status_not_submitted"
  | "status_answered_not_submitted"
  | "assignment_type"
  | "assignment_type_assignment"
  | "assignment_type_quiz"
  | "work_mode"
  | "work_mode_individual"
  | "work_mode_group"
  | "sort"
  | "sort_by"
  | "sort_order"
  | "sort_earliest_first"
  | "sort_latest_first"
  | "group_by"
  | "group_by_class"
  | "group_by_due_date"
  | "hidden"
  | "hidden_items"
  | "hidden_items_description"
  | "restore_all"
  | "restored"
  | "calendar_week"
  | "calendar_month"
  | "calendar_previous_month"
  | "calendar_next_month"
  | "calendar_current_month"
  | "calendar_previous_week"
  | "calendar_next_week"
  | "calendar_current_week"
  | "calendar_more_items"
  | "no_assignments"
  | "no_assignments_description"
  | "no_classes"
  | "no_classes_description"
  | "go_to_classes"
  | "assignments_rate_limited"
  | "assignments_rate_limited_description"
  | "assignments_rate_limited_inline_description"
  | "assignments_load_error"
  | "assignments_load_error_description"
  | "assignments_stale_warning"
  | "try_again"
  | "retry_after"
  | "retrying"
  | "tip_label"
  | "tip_hide"
  | "tip_shortcut"
  | "tip_calendar"
  | "tip_restore"
  | "tip_next"
  | "manual_due_date_set"
  | "manual_due_date_edit"
  | "manual_due_date_remove"
  | "manual_due_date_badge"
  | "manual_due_date_description"
  | "manual_due_date_official"
  | "manual_due_date_field_label"
  | "manual_due_date_timezone"
  | "manual_due_date_invalid"
  | "manual_due_date_save_error"
  | "manual_due_date_save"
  | "cancel"
  | "saving"
  | "settings"
  | "language"
  | "language_description"
  | "language_auto"
  | "language_en"
  | "language_th"
  | "time_format"
  | "time_format_description"
  | "time_format_12h"
  | "time_format_24h"
  | "reduce_motion"
  | "reduce_motion_description"
  | "undated_assignments"
  | "undated_assignments_description"
  | "keyboard_shortcut"
  | "keyboard_shortcut_description"
  | "keyboard_shortcut_label"
  | "sponsor"
  | "notification_due_soon_title"
  | "notification_due_soon_24h"
  | "notification_due_soon_1h"
  | "notification_view_assignment"
  | "onboarding_page_title"
  | "onboarding_title"
  | "onboarding_subtitle"
  | "onboarding_feature_track"
  | "onboarding_feature_notify"
  | "onboarding_feature_language"
  | "onboarding_get_started"
  | "onboarding_footer_hint";

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
