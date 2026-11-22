import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { getAssignmentUrl } from "@/lib/assignment";
import {
  isCacheClassAssignmentsMessage,
  isPublishEnrollmentMessage,
} from "@/lib/assignment-cache";
import type {
  CacheClassAssignmentsMessage,
  PublishEnrollmentMessage,
} from "@/lib/assignment-cache";
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
  classInfoStorage,
  deadlineNotificationHistoryStorage,
  hiddenAssignmentsStorage,
  hiddenClassesStorage,
  languageStorage,
  manualDueDatesStorage,
  notifiedAssignments1hStorage,
  notifiedAssignmentsStorage,
  readEnrollmentScope,
  userIdStorage,
} from "@/lib/storage";
import type { Activity, AssignmentSnapshot, EnrollmentScope } from "@/types";

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
  void notifications.create(
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

const readReminderEnrollment = async () => {
  const scope = readEnrollmentScope(await classInfoStorage.getValue());
  return {
    scope,
    userId: scope?.userId ?? (await userIdStorage.getValue()),
  };
};

const filterEnrolledAssignments = (
  assignments: Activity[],
  classes: NonNullable<EnrollmentScope["classes"]>
) => {
  const classIds = new Set(classes.map(({ id }) => id));
  return assignments.filter(({ class_id }) => classIds.has(class_id));
};

const filterCacheForScope = (
  cached: AssignmentSnapshot,
  { classes, pendingCachePrune, userId }: EnrollmentScope
) => {
  const enrolled =
    (!cached.userId || cached.userId === userId) && classes !== null
      ? filterEnrolledAssignments(cached.assignments, classes)
      : cached.assignments;
  if (pendingCachePrune?.userId !== cached.userId) {
    return enrolled;
  }
  const excluded = new Set(pendingCachePrune.classIds);
  return enrolled.filter(({ class_id }) => !excluded.has(class_id));
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
      enrollment,
      language,
    ] = await Promise.all([
      cachedAssignmentsStorage.getValue(),
      hiddenClassesStorage.getValue(),
      hiddenAssignmentsStorage.getValue(),
      notifiedAssignmentsStorage.getValue(),
      notifiedAssignments1hStorage.getValue(),
      manualDueDatesStorage.getValue(),
      deadlineNotificationHistoryStorage.getValue(),
      readReminderEnrollment(),
      languageStorage.getValue(),
    ]);

    const snapshot = readAssignmentSnapshot(cached);
    if (snapshot.userId && snapshot.userId !== enrollment.userId) {
      return;
    }

    const locale = resolveLocale(language);
    const assignments = enrollment.scope
      ? filterCacheForScope(snapshot, enrollment.scope)
      : snapshot.assignments;

    const result = reviewDeadlineNotifications({
      assignments: assignments.map((assignment) =>
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

const pruneAssignmentCache = async (
  scope: EnrollmentScope,
  nextScope?: EnrollmentScope
): Promise<EnrollmentScope["pendingCachePrune"]> => {
  if (scope.classes === null && !scope.pendingCachePrune) {
    return;
  }
  const cached = readAssignmentSnapshot(
    await cachedAssignmentsStorage.getValue()
  );
  if (!cached.userId) {
    return;
  }
  const assignments = filterCacheForScope(cached, scope);
  if (assignments.length === cached.assignments.length) {
    return;
  }

  try {
    await cachedAssignmentsStorage.setValue({
      assignments,
      userId: cached.userId,
    });
  } catch (error) {
    if (!nextScope) {
      throw error;
    }
    // Carry both scopes' exclusions if the snapshot survives the transition.
    const retained = filterCacheForScope({ ...cached, assignments }, nextScope);
    const retainedClassIds = new Set(retained.map(({ class_id }) => class_id));
    const removedClassIds = new Set<number>();
    for (const { class_id } of cached.assignments) {
      if (!retainedClassIds.has(class_id)) {
        removedClassIds.add(class_id);
      }
    }
    return { classIds: [...removedClassIds], userId: cached.userId };
  }
};

const hasSameMembership = (
  previousClasses: EnrollmentScope["classes"],
  classes: EnrollmentScope["classes"]
) => {
  if (previousClasses === classes) {
    return true;
  }
  if (previousClasses === null || classes === null) {
    return false;
  }
  const previousClassIds = new Set(previousClasses.map(({ id }) => id));
  return (
    classes.length === previousClassIds.size &&
    classes.every(({ id }) => previousClassIds.has(id))
  );
};

const publishEnrollment = (message: PublishEnrollmentMessage) =>
  enqueue(async () => {
    const stored = await classInfoStorage.getValue();
    const previous = readEnrollmentScope(stored);
    const { userId } = message;
    const classes =
      message.classes ??
      (!Array.isArray(stored) && stored.userId === userId
        ? stored.classes
        : null);
    const generation =
      previous?.userId === userId &&
      hasSameMembership(previous.classes, classes)
        ? previous.generation
        : crypto.randomUUID();
    const scope: EnrollmentScope = { classes, generation, userId };

    if (previous?.generation !== generation) {
      // Repair lingering rows before a new roster for their owner can expose
      // them again, including when a removed class is re-added.
      const pendingCachePrune =
        previous && (await pruneAssignmentCache(previous, scope));
      if (pendingCachePrune) {
        // Revoke the old generation without exposing the dirty snapshot.
        await classInfoStorage.setValue({
          ...scope,
          classes: pendingCachePrune.userId === userId ? null : classes,
          pendingCachePrune,
        });
        return { ok: true };
      }
      await classInfoStorage.setValue(scope);
    } else if (JSON.stringify(previous.classes) !== JSON.stringify(classes)) {
      await classInfoStorage.setValue({ ...previous, classes });
    }
    await pruneAssignmentCache(scope);
    return { ok: true };
  });

const cacheClassAssignments = (message: CacheClassAssignmentsMessage) =>
  enqueue(async () => {
    const scope = readEnrollmentScope(await classInfoStorage.getValue());
    if (
      scope?.userId !== message.userId ||
      scope.generation !== message.generation ||
      !scope.classes?.some(({ id }) => id === message.classId)
    ) {
      return { discarded: true, ok: false };
    }
    const cached = readAssignmentSnapshot(
      await cachedAssignmentsStorage.getValue()
    );
    const retained =
      cached.userId === message.userId
        ? filterCacheForScope(cached, scope).filter(
            ({ class_id }) => class_id !== message.classId
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

interface WorkerResponse {
  discarded?: boolean;
  ok: boolean;
}

const sendAsyncResponse = async (
  operation: Promise<WorkerResponse>,
  sendResponse: (response: WorkerResponse) => void
) => {
  let response: WorkerResponse;
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
      let operation: Promise<WorkerResponse>;
      if (isCacheClassAssignmentsMessage(message)) {
        operation = cacheClassAssignments(message);
      } else if (isPublishEnrollmentMessage(message)) {
        operation = publishEnrollment(message);
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
  classInfoStorage.watch(() => {
    void checkCachedAssignments();
  });

  const { notifications } = browser;
  notifications?.onClicked?.addListener(openNotificationAssignment);
  if (supportsNotificationButtons()) {
    notifications?.onButtonClicked?.addListener(openNotificationAssignment);
  }
});
