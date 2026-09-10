import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { fetchAssignments } from "@/lib/api";
import { getAssignmentUrl, isSubmitted } from "@/lib/assignment";
import {
  classInfoStorage,
  notifiedAssignments1hStorage,
  notifiedAssignmentsStorage,
  userIdStorage,
} from "@/lib/storage";
import type { Activity } from "@/types";

const DUE_SOON_MESSAGES = {
  "1h": "is due in less than 1 hour.",
  "24h": "is due in less than 24 hours.",
} as const;

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

/**
 * Ids already notified per timeframe, plus dirty flags so we only write back
 * to storage when something actually changed.
 */
interface NotifiedState {
  changedDay: boolean;
  changedHour: boolean;
  idsDay: Set<number>;
  idsHour: Set<number>;
}

function notifyDueSoon(assignment: Activity, timeframe: "24h" | "1h") {
  const idSuffix = timeframe === "1h" ? "-1h" : "";
  browser.notifications.create(
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
}

function reviewAssignment(
  assignment: Activity,
  state: NotifiedState,
  now: Date
) {
  const dueDate = new Date(assignment.due_date);

  if (isSubmitted(assignment) || dueDate <= now) {
    state.changedDay = state.idsDay.delete(assignment.id) || state.changedDay;
    state.changedHour =
      state.idsHour.delete(assignment.id) || state.changedHour;
    return;
  }

  if (!assignment.due_date) {
    return;
  }

  const dueWithinDay = dueDate.getTime() - now.getTime() <= DAY_IN_MS;
  if (dueWithinDay && !state.idsDay.has(assignment.id)) {
    notifyDueSoon(assignment, "24h");
    state.idsDay.add(assignment.id);
    state.changedDay = true;
  }

  const dueWithinHour = dueDate.getTime() - now.getTime() <= HOUR_IN_MS;
  if (dueWithinHour && !state.idsHour.has(assignment.id)) {
    notifyDueSoon(assignment, "1h");
    state.idsHour.add(assignment.id);
    state.changedHour = true;
  }
}

async function reviewClass(
  classId: number,
  userId: string,
  state: NotifiedState
) {
  try {
    const assignments = await fetchAssignments(classId, userId);
    const now = new Date();
    for (const assignment of assignments) {
      reviewAssignment(assignment, state, now);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : error;
    console.error(`Failed to check assignments for class ${classId}:`, detail);
  }
}

async function checkAssignments() {
  const [userId, classInfo, notifiedDay, notifiedHour] = await Promise.all([
    userIdStorage.getValue(),
    classInfoStorage.getValue(),
    notifiedAssignmentsStorage.getValue(),
    notifiedAssignments1hStorage.getValue(),
  ]);

  if (!(userId && classInfo)) {
    return;
  }

  const state: NotifiedState = {
    changedDay: false,
    changedHour: false,
    idsDay: new Set(notifiedDay),
    idsHour: new Set(notifiedHour),
  };

  await Promise.all(classInfo.map((cls) => reviewClass(cls.id, userId, state)));

  if (state.changedDay) {
    await notifiedAssignmentsStorage.setValue([...state.idsDay]);
  }

  if (state.changedHour) {
    await notifiedAssignments1hStorage.setValue([...state.idsHour]);
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      browser.tabs.create({
        url: browser.runtime.getURL("/onboarding.html"),
      });
    }
  });

  browser.alarms.create("checkAssignments", { periodInMinutes: 1 });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "checkAssignments") {
      await checkAssignments();
    }
  });

  browser.notifications.onButtonClicked.addListener((notificationId) => {
    if (notificationId.startsWith("assignwatch-")) {
      const [type, classId, assignmentId] = notificationId.split("-").slice(1);
      browser.tabs.create({
        url: getAssignmentUrl({
          class_id: Number(classId),
          id: Number(assignmentId),
          type: type as Activity["type"],
        }),
      });
    }
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
