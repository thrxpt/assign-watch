import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { getAssignmentUrl } from "@/lib/assignment";
import { isCacheClassAssignmentsMessage } from "@/lib/assignment-cache";
import type { CacheClassAssignmentsMessage } from "@/lib/assignment-cache";
import { resolveLocale, translate } from "@/lib/i18n";
import type { Locale, TranslationKey } from "@/lib/i18n";
import { isManualDueDateMessage } from "@/lib/manual-due-date-storage";
import type { ManualDueDateMessage } from "@/lib/manual-due-date-storage";
import {
  getAssignmentKey,
  readAssignmentSnapshot,
  resolveAssignment,
} from "@/lib/manual-due-dates";
import { reviewDeadlineNotifications } from "@/lib/notification";
import type { Timeframe } from "@/lib/notification";
import {
  cachedAssignmentsStorage,
  deadlineNotificationHistoryStorage,
  hiddenAssignmentsStorage,
  hiddenClassesStorage,
  languageStorage,
  manualDueDatesStorage,
  notifiedAssignments1hStorage,
  notifiedAssignmentsStorage,
  userIdStorage,
} from "@/lib/storage";
import type { Activity } from "@/types";

const ALARM_NAME = "reviewCachedAssignments";
const CHECK_INTERVAL_MINUTES = 10;

const DUE_SOON_MESSAGE_KEYS: Record<Timeframe, TranslationKey> = {
  "1h": "notification_due_soon_1h",
  "24h": "notification_due_soon_24h",
};

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

const supportsNotificationButtons = () => {
  const { BROWSER } = import.meta.env;
  return BROWSER === "chrome" || BROWSER === "edge" || BROWSER === "opera";
};

const notifyDueSoon = (
  notifications: Pick<typeof browser.notifications, "create">,
  assignment: Activity,
  timeframe: Timeframe,
  locale: Locale
) => {
  const idSuffix = timeframe === "1h" ? "-1h" : "";
  return notifications.create(
    `assignwatch-${assignment.type}-${assignment.class_id}-${assignment.id}${idSuffix}`,
    {
      ...(supportsNotificationButtons() && {
        buttons: [{ title: translate("notification_view_assignment", locale) }],
      }),
      iconUrl: browser.runtime.getURL("/icons/128.png"),
      message: translate(DUE_SOON_MESSAGE_KEYS[timeframe], locale, {
        title: assignment.title,
      }),
      title: translate("notification_due_soon_title", locale),
      type: "basic",
    }
  );
};

const reviewCachedAssignments = async () => {
  const { notifications } = browser;
  if (typeof notifications?.create !== "function") {
    return;
  }

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
      language,
    ] = await Promise.all([
      cachedAssignmentsStorage.getValue(),
      hiddenClassesStorage.getValue(),
      hiddenAssignmentsStorage.getValue(),
      notifiedAssignmentsStorage.getValue(),
      notifiedAssignments1hStorage.getValue(),
      manualDueDatesStorage.getValue(),
      deadlineNotificationHistoryStorage.getValue(),
      userIdStorage.getValue(),
      languageStorage.getValue(),
    ]);

    const snapshot = readAssignmentSnapshot(cached);
    if (snapshot.userId && snapshot.userId !== currentUserId) {
      return;
    }

    const locale = resolveLocale(language);

    const result = await reviewDeadlineNotifications({
      assignments: snapshot.assignments.map((assignment) =>
        resolveAssignment(assignment, snapshot.userId, manualDueDates)
      ),
      hiddenAssignments,
      hiddenClasses,
      history,
      legacyNotifiedDay: notifiedDay,
      legacyNotifiedHour: notifiedHour,
      notify: (assignment, timeframe) =>
        notifyDueSoon(notifications, assignment, timeframe, locale),
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
    void browser.notifications?.clear?.(notificationId);
  }
};

const cacheClassAssignments = (message: CacheClassAssignmentsMessage) =>
  enqueue(async () => {
    const cached = readAssignmentSnapshot(
      await cachedAssignmentsStorage.getValue()
    );
    const enrolledClassIds = new Set(message.classIds);
    const retained =
      cached.userId === message.userId
        ? cached.assignments.filter(
            (assignment) =>
              assignment.class_id !== message.classId &&
              enrolledClassIds.has(assignment.class_id)
          )
        : [];
    await cachedAssignmentsStorage.setValue({
      assignments: [...retained, ...message.assignments],
      userId: message.userId,
    });
    return { ok: true };
  });

const setManualDueDate = (message: ManualDueDateMessage) =>
  enqueue(async () => {
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
              item.id === assignment.id && item.class_id === assignment.class_id
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

const openOptionsPage = async () => {
  try {
    await browser.runtime.openOptionsPage();
  } catch {
    await browser.tabs.create({
      url: browser.runtime.getURL("/options.html"),
    });
  }
  return { ok: true };
};

const sendAsyncResponse = async (
  operation: Promise<{ ok: boolean }>,
  sendResponse: (response: { ok: boolean }) => void
) => {
  let response: { ok: boolean };
  try {
    response = await operation;
  } catch {
    response = { ok: false };
  }
  sendResponse(response);
};

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse) => {
      let operation: Promise<{ ok: boolean }>;
      if (isCacheClassAssignmentsMessage(message)) {
        operation = cacheClassAssignments(message);
      } else if (isManualDueDateMessage(message)) {
        operation = setManualDueDate(message);
      } else if (
        message &&
        typeof message === "object" &&
        "action" in message &&
        message.action === "openOptionsPage"
      ) {
        operation = openOptionsPage();
      } else {
        return;
      }
      void sendAsyncResponse(operation, sendResponse);
      // Keep the response channel open on browsers that require a callback.
      return true;
    }
  );

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

  const { notifications } = browser;
  notifications?.onClicked?.addListener(openNotificationAssignment);
  if (supportsNotificationButtons()) {
    notifications?.onButtonClicked?.addListener(openNotificationAssignment);
  }
});
