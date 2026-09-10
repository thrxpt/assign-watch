import { describe, expect, it } from "vitest";

import { resolveLocale, translate } from "@/lib/i18n";

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
      expect(translate("settings", "en")).toBe("Settings");
      expect(translate("settings", "th")).toBe("การตั้งค่า");
      expect(translate("language", "en")).toBe("Language");
      expect(translate("language", "th")).toBe("ภาษา");
      expect(translate("language_desc", "en")).toBe(
        "Choose your preferred interface language."
      );
      expect(translate("language_desc", "th")).toBe(
        "เลือกภาษาของอินเทอร์เฟซที่คุณต้องการ"
      );
      expect(translate("keyboard_shortcut", "en")).toBe("Keyboard Shortcut");
      expect(translate("keyboard_shortcut", "th")).toBe("แป้นพิมพ์ลัด");
      expect(translate("keyboard_shortcut_desc", "en")).toBe(
        "Toggle the assignment dialog anywhere on LEB2."
      );
      expect(translate("keyboard_shortcut_desc", "th")).toBe(
        "เปิดหรือปิดหน้าต่างการบ้านที่หน้าไหนของ LEB2 ก็ได้"
      );
      expect(translate("shortcut", "en")).toBe("Shortcut");
      expect(translate("shortcut", "th")).toBe("ปุ่มลัด");
      expect(translate("hidden_items_desc", "en")).toBe(
        "Restore all classes and assignments hidden on LEB2."
      );
      expect(translate("hidden_items_desc", "th")).toBe(
        "กู้คืนชั้นเรียนและการบ้านทั้งหมดที่ซ่อนไว้บน LEB2"
      );
      expect(translate("cleared", "en")).toBe("Cleared!");
      expect(translate("cleared", "th")).toBe("ล้างแล้ว!");
      expect(translate("sponsor", "en")).toBe("Sponsor");
      expect(translate("sponsor", "th")).toBe("สนับสนุน");
    });

    it("interpolates named tokens", () => {
      expect(translate("tips_shortcut", "en", { shortcut: "⌥ + A" })).toBe(
        "Press ⌥ + A anywhere on LEB2 to open or close this dialog."
      );
      expect(translate("tips_shortcut", "th", { shortcut: "⌥ + A" })).toBe(
        "กด ⌥ + A ที่หน้าไหนของ LEB2 ก็ได้ เพื่อเปิดหรือปิดหน้าต่างนี้"
      );
    });

    it("returns key for missing translation", () => {
      expect(translate("unknown_key", "en")).toBe("unknown_key");
    });
  });
});
