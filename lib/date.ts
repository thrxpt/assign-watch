import { format } from "date-fns";
import { enUS, th } from "date-fns/locale";
import moment from "moment/min/moment-with-locales";
import { i18n } from "#i18n";

export function formatDateRelative(date: Date): {
  status: "late" | "today" | "upcoming";
  text: string;
} {
  moment.locale(i18n.t("@@ui_locale") === "th" ? "th" : "en");
  return {
    text: moment(date).fromNow(),
    status: moment(date).isBefore(moment())
      ? "late"
      : moment(date).isSame(new Date(), "day")
        ? "today"
        : "upcoming",
  };
}

export function formatDate(date: Date, formatStr: string) {
  return format(date, formatStr, {
    locale: i18n.t("@@ui_locale") === "th" ? th : enUS,
  });
}
