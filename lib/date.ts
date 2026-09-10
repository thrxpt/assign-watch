import { format } from "date-fns";
import { enUS, th } from "date-fns/locale";
import moment from "moment/min/moment-with-locales";

import { getActiveLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { DEFAULT_TIME_FORMAT } from "@/lib/preferences";
import type { TimeFormat } from "@/lib/preferences";

export function formatDateRelative(
  date: Date,
  locale?: Locale
): {
  status: "late" | "today" | "upcoming";
  text: string;
} {
  const activeLocale = locale ?? getActiveLocale();
  moment.locale(activeLocale);

  const target = moment(date);
  let status: "late" | "today" | "upcoming" = "upcoming";
  if (target.isBefore(moment())) {
    status = "late";
  } else if (target.isSame(new Date(), "day")) {
    status = "today";
  }

  return { status, text: target.fromNow() };
}

export function formatDate(
  date: Date,
  formatStr: string,
  locale?: Locale
): string {
  const activeLocale = locale ?? getActiveLocale();
  return format(date, formatStr, {
    locale: activeLocale === "th" ? th : enUS,
  });
}

export function formatTime(
  date: Date,
  timeFormat: TimeFormat = DEFAULT_TIME_FORMAT
): string {
  const formatStr = timeFormat === "12h" ? "h:mm a" : "HH:mm";
  return format(date, formatStr, {
    locale: enUS,
  });
}
