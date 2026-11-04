import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { getAssignmentUrl } from "@/lib/assignment";
import { isManualDueDateMessage } from "@/lib/manual-due-date-storage";
import {
  getAssignmentKey,
  readAssignmentSnapshot,
  resolveAssignment,
} from "@/lib/manual-due-dates";
import {
  DUE_SOON_MESSAGES,
  reviewDeadlineNotifications,
} from "@/lib/notification";
import type { Timeframe } from "@/lib/notification";
import {
  cachedAssignmentsStorage,
  deadlineNotificationHistoryStorage,
  manualDueDatesStorage,
  hiddenAssignmentsStorage,
  hiddenClassesStorage,
  notifiedAssignments1hStorage,
  notifiedAssignmentsStorage,
  userIdStorage,
} from "@/lib/storage";
import type { Activity } from "@/types";

const ALARM_NAME = "reviewCachedAssignments";
const CHECK_INTERVAL_MINUTES = 10;

let backgroundQueue: Promise<void> = Promise.resolve();
const enqueue = async <T>(task: () => Promise<T>): Promise<T> => {
  const previous = backgroundQueue;
  const { promise, resolve } = Promise.withResolvers<void>();
  backgroundQueue = promise;
  try {
    await previous;
    return await task();
  } finally {
    resolve();
  }
};

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

const reviewCachedAssignments = async () => {
  try {
    const [
      cached,
      hiddenClasses,
      hiddenAssignments,
      notifiedDay,
      notifiedHour,
      manualDueDates,
      history,
      currentUserId,
    ] = await Promise.all([
      cachedAssignmentsStorage.getValue(),
      hiddenClassesStorage.getValue(),
      hiddenAssignmentsStorage.getValue(),
      notifiedAssignmentsStorage.getValue(),
      notifiedAssignments1hStorage.getValue(),
      manualDueDatesStorage.getValue(),
      deadlineNotificationHistoryStorage.getValue(),
      userIdStorage.getValue(),
    ]);

    const snapshot = readAssignmentSnapshot(cached);
    if (snapshot.userId && snapshot.userId !== currentUserId) {
      return;
    }

    const result = reviewDeadlineNotifications({
      assignments: snapshot.assignments.map((assignment) =>
        resolveAssignment(assignment, snapshot.userId, manualDueDates)
      ),
      hiddenAssignments,
      hiddenClasses,
      history,
      legacyNotifiedDay: notifiedDay,
      legacyNotifiedHour: notifiedHour,
      notify: notifyDueSoon,
      now: new Date(),
      userId: snapshot.userId,
    });

    if (result.changed) {
      await deadlineNotificationHistoryStorage.setValue(result.history);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to check cached assignments:", message);
  }
};

const checkCachedAssignments = () => enqueue(reviewCachedAssignments);

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

  manualDueDatesStorage.watch(() => {
    void checkCachedAssignments();
  });
  userIdStorage.watch(() => {
    void checkCachedAssignments();
  });

  browser.notifications.onButtonClicked.addListener((notificationId) => {
    openNotificationAssignment(notificationId);
  });

  browser.notifications.onClicked.addListener((notificationId) => {
    openNotificationAssignment(notificationId);
  });

  browser.runtime.onMessage.addListener(async (message) => {
    if (isManualDueDateMessage(message)) {
      try {
        return await enqueue(async () => {
          const cached = readAssignmentSnapshot(
            await cachedAssignmentsStorage.getValue()
          );
          const assignment = {
            class_id: message.classId,
            id: message.assignmentId,
          };
          const current =
            cached.userId === message.userId
              ? cached.assignments.find(
                  (item) =>
                    item.id === assignment.id &&
                    item.class_id === assignment.class_id
                )
              : undefined;
          if (message.dueDate && current?.due_date) {
            return { ok: false };
          }
          const dates = new Map(
            Object.entries(await manualDueDatesStorage.getValue())
          );
          const key = getAssignmentKey(message.userId, assignment);
          if (message.dueDate === null) {
            dates.delete(key);
          } else {
            dates.set(key, new Date(message.dueDate).toISOString());
          }
          await manualDueDatesStorage.setValue(Object.fromEntries(dates));
          return { ok: true };
        });
      } catch {
        return { ok: false };
      }
    }
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
