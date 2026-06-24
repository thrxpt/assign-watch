import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { fetchAssignments } from "@/lib/api";
import { getAssignmentUrl, getSubmissionStatus } from "@/lib/assignment";
import {
  classInfoStorage,
  notifiedAssignments1hStorage,
  notifiedAssignmentsStorage,
  userIdStorage,
} from "@/lib/storage";
import type { Activity } from "@/types";

const DUE_SOON_MESSAGES = {
  "24h": "is due in less than 24 hours.",
  "1h": "is due in less than 1 hour.",
} as const;

function removeNotified(list: number[], id: number): boolean {
  const index = list.indexOf(id);
  if (index > -1) {
    list.splice(index, 1);
    return true;
  }
  return false;
}

function notifyDueSoon(assignment: Activity, timeframe: "24h" | "1h") {
  const idSuffix = timeframe === "1h" ? "-1h" : "";
  browser.notifications.create(
    `assignwatch-${assignment.type}-${assignment.class_id}-${assignment.id}${idSuffix}`,
    {
      type: "basic",
      iconUrl: browser.runtime.getURL("/icons/128.png"),
      title: "Assignment Due Soon!",
      message: `"${assignment.title}" ${DUE_SOON_MESSAGES[timeframe]}`,
      buttons: [
        {
          title: "View Assignment",
        },
      ],
    }
  );
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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Suppress complexity warning
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "checkAssignments") {
      const userId = await userIdStorage.getValue();
      const classInfo = await classInfoStorage.getValue();
      const notifiedAssignments =
        (await notifiedAssignmentsStorage.getValue()) ?? [];
      const notifiedAssignments1h =
        (await notifiedAssignments1hStorage.getValue()) ?? [];

      if (!(userId && classInfo)) {
        return;
      }

      let shouldUpdate = false;
      let shouldUpdate1h = false;

      for (const cls of classInfo) {
        try {
          const assignments = await fetchAssignments(cls.id, userId);
          const now = new Date();
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          const oneHour = new Date(now.getTime() + 60 * 60 * 1000);

          for (const assignment of assignments) {
            const status = getSubmissionStatus(assignment);
            const isSubmitted =
              status === "submitted" || status === "submitted_late";
            const dueDate = new Date(assignment.due_date);
            const isOverdue = dueDate < now;

            if (isSubmitted || isOverdue) {
              if (removeNotified(notifiedAssignments, assignment.id)) {
                shouldUpdate = true;
              }
              if (removeNotified(notifiedAssignments1h, assignment.id)) {
                shouldUpdate1h = true;
              }
            }

            if (assignment.due_date && !isSubmitted) {
              if (
                !notifiedAssignments.includes(assignment.id) &&
                dueDate > now &&
                dueDate <= tomorrow
              ) {
                notifyDueSoon(assignment, "24h");
                notifiedAssignments.push(assignment.id);
                shouldUpdate = true;
              }

              if (
                !notifiedAssignments1h.includes(assignment.id) &&
                dueDate > now &&
                dueDate <= oneHour
              ) {
                notifyDueSoon(assignment, "1h");
                notifiedAssignments1h.push(assignment.id);
                shouldUpdate1h = true;
              }
            }
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error(
              `Failed to check assignments for class ${cls.id}:`,
              error.message
            );
          } else {
            console.error(
              `Failed to check assignments for class ${cls.id}:`,
              error
            );
          }
        }
      }

      if (shouldUpdate) {
        await notifiedAssignmentsStorage.setValue(notifiedAssignments);
      }

      if (shouldUpdate1h) {
        await notifiedAssignments1hStorage.setValue(notifiedAssignments1h);
      }
    }
  });

  browser.notifications.onButtonClicked.addListener((notificationId) => {
    if (notificationId.startsWith("assignwatch-")) {
      const [type, classId, assignmentId] = notificationId.split("-").slice(1);
      browser.tabs.create({
        url: getAssignmentUrl({
          type: type as Activity["type"],
          class_id: Number(classId),
          id: Number(assignmentId),
        }),
      });
    }
  });
});
