import { describe, expect, it } from "vitest";

import { formatDate, formatDateRelative, formatTime } from "@/lib/date";
import { setActiveLocale } from "@/lib/i18n";

describe("date formatting", () => {
  const testDate = new Date("2025-01-15T12:00:00Z");

  describe("formatDate", () => {
    it("formats with English locale by default or explicitly", () => {
      const formattedEn = formatDate(testDate, "MMMM", "en");
      expect(formattedEn).toBe("January");
    });

    it("formats with Thai locale when specified", () => {
      const formattedTh = formatDate(testDate, "MMMM", "th");
      expect(formattedTh).toBe("มกราคม");
    });
  });

  describe("formatDateRelative", () => {
    it("returns relative date object with status and localized text", () => {
      const past = new Date(Date.now() - 3600 * 1000 * 24);
      const resEn = formatDateRelative(past, "en");
      expect(resEn.status).toBe("late");
      expect(typeof resEn.text).toBe("string");

      const resTh = formatDateRelative(past, "th");
      expect(resTh.status).toBe("late");
      expect(typeof resTh.text).toBe("string");
    });
  });

  describe("formatTime", () => {
    const afternoonDate = new Date(2025, 0, 15, 14, 30);
    const morningDate = new Date(2025, 0, 15, 9, 5);

    it("formats 12-hour time with AM/PM by default or explicitly", () => {
      expect(formatTime(afternoonDate, "12h")).toBe("2:30 PM");
      expect(formatTime(morningDate, "12h")).toBe("9:05 AM");
      expect(formatTime(afternoonDate)).toBe("2:30 PM");
    });

    it("keeps AM/PM even when active locale is Thai", () => {
      setActiveLocale("th");
      expect(formatTime(afternoonDate, "12h")).toBe("2:30 PM");
      expect(formatTime(morningDate, "12h")).toBe("9:05 AM");
      setActiveLocale("en");
    });

    it("formats 24-hour time", () => {
      expect(formatTime(afternoonDate, "24h")).toBe("14:30");
      expect(formatTime(morningDate, "24h")).toBe("09:05");
    });
  });
});
