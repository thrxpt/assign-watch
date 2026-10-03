import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { getAssignmentUrl } from "@/lib/assignment";
import type { Activity } from "@/types";

const openNotificationAssignment = (notificationId: string) => {
  if (notificationId.startsWith("assignwatch-")) {
    const [type, classId, assignmentId] = notificationId.split("-").slice(1);
    void browser.tabs.create({
      url: getAssignmentUrl({
        class_id: Number(classId),
        id: Number(assignmentId),
        type: type as Activity["type"],
      }),
    });
    void browser.notifications.clear(notificationId);
  }
};

export default defineBackground(() => {
  browser.runtime.onStartup.addListener(async () => {
    await browser.alarms.clearAll();
  });

  browser.runtime.onInstalled.addListener(async (details) => {
    await browser.alarms.clearAll();

    if (details.reason === "install") {
      await browser.tabs.create({
        url: browser.runtime.getURL("/onboarding.html"),
      });
    }
  });
  browser.notifications.onButtonClicked.addListener((notificationId) => {
    openNotificationAssignment(notificationId);
  });

  browser.notifications.onClicked.addListener((notificationId) => {
    openNotificationAssignment(notificationId);
  });

  browser.runtime.onMessage.addListener(async (message) => {
    if (message?.action === "openOptionsPage") {
      try {
        await browser.runtime.openOptionsPage();
      } catch {
        await browser.tabs.create({
          url: browser.runtime.getURL("/options.html"),
        });
      }
    }
  });
});
