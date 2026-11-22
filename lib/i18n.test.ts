import { describe, expect, it } from "vitest";

import {
  EN_MESSAGES,
  TH_MESSAGES,
  isTranslationKey,
  resolveLocale,
  translate,
} from "@/lib/i18n";

const PLACEHOLDER_REGEX = /\{(?<name>\w+)\}/gu;

function extractPlaceholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER_REGEX)]
    .map((match) => match.groups?.name ?? "")
    .toSorted();
}

describe("i18n", () => {
  describe("resolveLocale", () => {
    it("explicitly selects en and th regardless of system language", () => {
      expect(resolveLocale("en", "th-TH")).toBe("en");
      expect(resolveLocale("th", "en-US")).toBe("th");
    });

    it("falls back based on system language when set to auto", () => {
      expect(resolveLocale("auto", "th-TH")).toBe("th");
      expect(resolveLocale("auto", "th")).toBe("th");
      expect(resolveLocale("auto", "en-US")).toBe("en");
      expect(resolveLocale("auto", "ja-JP")).toBe("en");
      expect(resolveLocale("auto")).toBe("en");
    });
  });

  describe("translate", () => {
    it("retrieves correct strings from yaml for both locales", () => {
      expect(translate("todo", "en")).toBe("To-do");
      expect(translate("todo", "th")).toBe("สิ่งที่ต้องทำ");
      expect(translate("classes", "en")).toBe("Classes");
      expect(translate("classes", "th")).toBe("รายวิชา");
      expect(translate("assignments", "en")).toBe("Assignments");
      expect(translate("assignments", "th")).toBe("งาน");
      expect(translate("assignment_type_assignment", "en")).toBe("Assignment");
      expect(translate("assignment_type_assignment", "th")).toBe("งานที่มอบหมาย");
      expect(translate("assignment_type_quiz", "en")).toBe("Quiz");
      expect(translate("assignment_type_quiz", "th")).toBe("แบบทดสอบ");
      expect(translate("work_mode", "en")).toBe("Work mode");
      expect(translate("work_mode", "th")).toBe("รูปแบบงาน");
      expect(translate("due_date", "en")).toBe("Due date");
      expect(translate("due_date", "th")).toBe("กำหนดส่ง");
      expect(translate("posted_date", "en")).toBe("Posted date");
      expect(translate("posted_date", "th")).toBe("วันที่ประกาศ");
      expect(translate("sort_earliest_first", "en")).toBe("Earliest first");
      expect(translate("sort_earliest_first", "th")).toBe("ก่อนไปหลัง");
      expect(translate("sort_latest_first", "en")).toBe("Latest first");
      expect(translate("sort_latest_first", "th")).toBe("หลังไปก่อน");
      expect(translate("restore_all", "en")).toBe("Restore all");
      expect(translate("restore_all", "th")).toBe("เลิกซ่อนทั้งหมด");
      expect(translate("status_answered_not_submitted", "en")).toBe(
        "Answered (not submitted)"
      );
      expect(translate("status_answered_not_submitted", "th")).toBe(
        "ทำแล้ว (ยังไม่ส่ง)"
      );
      expect(translate("settings", "en")).toBe("Settings");
      expect(translate("settings", "th")).toBe("การตั้งค่า");
      expect(translate("language", "en")).toBe("Language");
      expect(translate("language", "th")).toBe("ภาษา");
      expect(translate("language_description", "en")).toBe(
        "Choose your preferred display language."
      );
      expect(translate("language_description", "th")).toBe(
        "เลือกภาษาที่ต้องการใช้แสดงผล"
      );
      expect(translate("time_format", "en")).toBe("Time format");
      expect(translate("time_format", "th")).toBe("รูปแบบเวลา");
      expect(translate("time_format_description", "en")).toBe(
        "Choose how times are displayed."
      );
      expect(translate("time_format_description", "th")).toBe(
        "เลือกรูปแบบการแสดงเวลา"
      );
      expect(translate("time_format_12h", "en")).toBe("12-hour");
      expect(translate("time_format_12h", "th")).toBe("12 ชั่วโมง");
      expect(translate("time_format_24h", "en")).toBe("24-hour");
      expect(translate("time_format_24h", "th")).toBe("24 ชั่วโมง");
      expect(translate("keyboard_shortcut", "en")).toBe("Keyboard shortcut");
      expect(translate("keyboard_shortcut", "th")).toBe("ปุ่มลัดแป้นพิมพ์");
      expect(translate("keyboard_shortcut_description", "en")).toBe(
        "Open or close Assign Watch anywhere on LEB2."
      );
      expect(translate("keyboard_shortcut_description", "th")).toBe(
        "เปิดหรือปิดหน้าต่าง Assign Watch ได้จากทุกหน้าบน LEB2"
      );
      expect(translate("keyboard_shortcut_label", "en")).toBe("Shortcut");
      expect(translate("keyboard_shortcut_label", "th")).toBe("ปุ่มลัด");
      expect(translate("hidden_items_description", "en")).toBe(
        "Restore all hidden classes and assignments."
      );
      expect(translate("hidden_items_description", "th")).toBe(
        "แสดงรายวิชาและงานที่ซ่อนไว้ทั้งหมดอีกครั้ง"
      );
      expect(translate("restored", "en")).toBe("Restored!");
      expect(translate("restored", "th")).toBe("เลิกซ่อนแล้ว!");
      expect(translate("section", "en")).toBe("Section");
      expect(translate("section", "th")).toBe("กลุ่มที่");
      expect(translate("sponsor", "en")).toBe("Sponsor");
      expect(translate("sponsor", "th")).toBe("สนับสนุน");
      expect(translate("no_classes", "en")).toBe("No classes found");
      expect(translate("no_classes", "th")).toBe("ไม่พบรายวิชา");
      expect(translate("no_classes_description", "en")).toBe(
        "Go to the classes page on LEB2 to sync your enrolled classes."
      );
      expect(translate("no_classes_description", "th")).toBe(
        "ไปที่หน้ารายวิชาบน LEB2 เพื่อซิงค์รายวิชาที่ลงทะเบียนเรียน"
      );
      expect(translate("go_to_classes", "en")).toBe("Go to classes");
      expect(translate("go_to_classes", "th")).toBe("ไปที่หน้ารายวิชา");
      expect(translate("notification_due_soon_title", "en")).toBe(
        "Assignment due soon"
      );
      expect(translate("notification_due_soon_title", "th")).toBe(
        "งานใกล้ถึงกำหนดส่ง"
      );
      expect(translate("notification_view_assignment", "en")).toBe(
        "View assignment"
      );
      expect(translate("notification_view_assignment", "th")).toBe("เปิดดูงาน");
    });

    it("interpolates named tokens", () => {
      expect(translate("tip_shortcut", "en", { shortcut: "⌥ + A" })).toBe(
        "Press ⌥ + A anywhere on LEB2 to open or close Assign Watch."
      );
      expect(translate("tip_shortcut", "th", { shortcut: "⌥ + A" })).toBe(
        "กด ⌥ + A ได้จากทุกหน้าบน LEB2 เพื่อเปิดหรือปิดหน้าต่าง Assign Watch"
      );
      expect(translate("calendar_more_items", "en", { count: 2 })).toBe(
        "+2 more"
      );
      expect(translate("calendar_more_items", "th", { count: 2 })).toBe(
        "อีก 2 รายการ"
      );
      expect(
        translate("notification_due_soon_1h", "en", { title: "Lab 1" })
      ).toBe('"Lab 1" is due in less than 1 hour.');
      expect(
        translate("notification_due_soon_1h", "th", { title: "Lab 1" })
      ).toBe('"Lab 1" จะครบกำหนดส่งในอีกไม่ถึง 1 ชั่วโมง');
    });

    it("returns key for missing translation", () => {
      expect(translate("unknown_key", "en")).toBe("unknown_key");
    });

    it("safely ignores Object.prototype properties without throwing", () => {
      expect(isTranslationKey("toString")).toBe(false);
      expect(isTranslationKey("valueOf")).toBe(false);
      expect(translate("toString", "en")).toBe("toString");
      expect(translate("valueOf", "th")).toBe("valueOf");
    });
  });

  describe("locale parity", () => {
    it("keeps identical ordered keys, non-empty values, and matching placeholders across locales", () => {
      const enKeys = Object.keys(EN_MESSAGES);
      const thKeys = Object.keys(TH_MESSAGES);
      expect(enKeys).toEqual(thKeys);

      for (const key of enKeys) {
        const enValue = EN_MESSAGES[key as keyof typeof EN_MESSAGES];
        const thValue = TH_MESSAGES[key as keyof typeof TH_MESSAGES];

        expect(typeof enValue).toBe("string");
        expect(enValue.trim().length).toBeGreaterThan(0);
        expect(typeof thValue).toBe("string");
        expect(thValue?.trim().length).toBeGreaterThan(0);
        expect(extractPlaceholders(thValue ?? "")).toEqual(
          extractPlaceholders(enValue)
        );
      }
    });
  });
});
