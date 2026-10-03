import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { getAssignmentUrl } from "@/lib/assignment";
import { DUE_SOON_MESSAGES, reviewAssignments } from "@/lib/notification";
import type { Timeframe } from "@/lib/notification";
import {
  cachedAssignmentsStorage,
  hiddenAssignmentsStorage,
  hiddenClassesStorage,
  notifiedAssignments1hStorage,
  notifiedAssignmentsStorage,
} from "@/lib/storage";
import type { Activity } from "@/types";

const ALARM_NAME = "reviewCachedAssignments";
const CHECK_INTERVAL_MINUTES = 10;

const notifyDueSoon = (assignment: Activity, timeframe: Timeframe) => {
  const idSuffix = timeframe === "1h" ? "-1h" : "";
  void browser.notifications.create(
    `assignwatch-${assignment.type}-${assignment.class_id}-${assignment.id}${idSuffix}`,
    {
      buttons: [
        {
          title: "View Assignment",
        },
      ],
      iconUrl: browser.runtime.getURL("/icons/128.png"),
      message: `"${assignment.title}" ${DUE_SOON_MESSAGES[timeframe]}`,
      title: "Assignment Due Soon!",
      type: "basic",
    }
  );
};

const checkCachedAssignments = async () => {
  try {
    const [
      assignments,
      hiddenClasses,
      hiddenAssignments,
      notifiedDay,
      notifiedHour,
    ] = await Promise.all([
      cachedAssignmentsStorage.getValue(),
      hiddenClassesStorage.getValue(),
      hiddenAssignmentsStorage.getValue(),
      notifiedAssignmentsStorage.getValue(),
      notifiedAssignments1hStorage.getValue(),
    ]);

    if (!assignments || assignments.length === 0) {
      return;
    }

    const result = reviewAssignments({
      assignments,
      hiddenAssignments,
      hiddenClasses,
      notifiedDay,
      notifiedHour,
      notify: notifyDueSoon,
      now: new Date(),
    });

    if (result.changedDay) {
      await notifiedAssignmentsStorage.setValue(result.nextNotifiedDay);
    }
    if (result.changedHour) {
      await notifiedAssignments1hStorage.setValue(result.nextNotifiedHour);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to check cached assignments:", message);
  }
};

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
  const setupAlarm = async () => {
    try {
      await browser.alarms.clear(ALARM_NAME);
      await browser.alarms.create(ALARM_NAME, {
        periodInMinutes: CHECK_INTERVAL_MINUTES,
      });
    } catch (error) {
      console.error("Failed to setup notification alarm:", error);
    }
  };

  browser.runtime.onStartup.addListener(async () => {
    await setupAlarm();
    await checkCachedAssignments();
  });

  browser.runtime.onInstalled.addListener(async (details) => {
    await browser.alarms.clear("checkAssignments");
    await setupAlarm();
    await checkCachedAssignments();

    if (details.reason === "install") {
      try {
        await browser.tabs.create({
          url: browser.runtime.getURL("/onboarding.html"),
        });
      } catch {
        // Ignore onboarding tab creation failure
      }
    }
  });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
      await checkCachedAssignments();
    }
  });

  cachedAssignmentsStorage.watch(() => {
    void checkCachedAssignments();
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
