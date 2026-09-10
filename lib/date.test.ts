import { describe, expect, it } from "vitest";

import { formatDate, formatDateRelative } from "@/lib/date";

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
});
