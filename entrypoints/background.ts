import {
  classInfoStorage,
  getAssignments,
  getSubmissionStatus,
  notifiedAssignmentsStorage,
  userIdStorage,
} from "@/lib/utils";

export default defineBackground(() => {
  browser.alarms.create("checkAssignments", { periodInMinutes: 1 });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "checkAssignments") {
      const userId = await userIdStorage.getValue();
      const classInfo = await classInfoStorage.getValue();
      const notifiedAssignments =
        (await notifiedAssignmentsStorage.getValue()) ?? [];

      if (!userId || !classInfo) return;

      let shouldUpdate = false;

      for (const cls of classInfo) {
        try {
          const assignments = await getAssignments(cls.id, userId);
          const now = new Date();
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

          for (const assignment of assignments) {
            const isSubmitted =
              getSubmissionStatus(assignment) === "submitted" ||
              getSubmissionStatus(assignment) === "submitted_late";
            const dueDate = new Date(assignment.due_date);
            const isOverdue = dueDate < now;

            if (notifiedAssignments.includes(assignment.id)) {
              if (isSubmitted || isOverdue) {
                const index = notifiedAssignments.indexOf(assignment.id);
                if (index > -1) {
                  notifiedAssignments.splice(index, 1);
                  shouldUpdate = true;
                }
              }
            }

            if (
              assignment.due_date &&
              !isSubmitted && // Not submitted
              !notifiedAssignments.includes(assignment.id) // Not yet notified
            ) {
              if (dueDate > now && dueDate <= tomorrow) {
                browser.notifications.create(
                  `assignwatch-${assignment.type}-${assignment.class_id}-${assignment.id}`,
                  {
                    type: "basic",
                    iconUrl: browser.runtime.getURL("/icons/128.png"),
                    title: "Assignment Due Soon!",
                    message: `"${assignment.title}" is due in less than 24 hours.`,
                    buttons: [
                      {
                        title: "View Assignment",
                      },
                    ],
                  },
                );

                notifiedAssignments.push(assignment.id);
                shouldUpdate = true;
              }
            }
          }
        } catch (error) {
          console.error(
            `Failed to check assignments for class ${cls.id}:`,
            error,
          );
        }
      }

      if (shouldUpdate) {
        await notifiedAssignmentsStorage.setValue(notifiedAssignments);
      }
    }
  });

  browser.notifications.onButtonClicked.addListener((notificationId) => {
    if (notificationId.startsWith("assignwatch-")) {
      const [type, classId, assignmentId] = notificationId.split("-").slice(1);
      browser.tabs.create({
        url: `https://app.leb2.org/class/${classId}/${type === "ASM" ? "activity" : "quiz"}/${assignmentId}`,
      });
    }
  });
});
