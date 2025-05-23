import { storage } from "#imports"
import dayjs from "dayjs"

import type { AssignmentResponse } from "@/types"

export default defineBackground(() => {
  async function checkUpcomingAssignments() {
    try {
      const [enabled, reminderTime] = await Promise.all([
        storage.getItem<boolean>("sync:notifications:enabled"),
        storage.getItem<string>("sync:notifications:reminderTime"),
      ])

      if (!enabled) return

      const now = dayjs()
      const reminderHours = parseInt(reminderTime || "72")
      const reminderThreshold = now.add(reminderHours, "hour")

      const classWithAssignments = await storage.getItem<
        {
          assignments: AssignmentResponse
          id: string
          title: string | null
          description: string | null
        }[]
      >("local:classWithAssignments")

      if (!classWithAssignments?.length) return

      for (const classInfo of classWithAssignments) {
        const assignments = classInfo.assignments?.activities || []
        if (!assignments.length) continue

        for (const assignment of assignments) {
          if (!assignment.due_date) continue

          const dueDate = dayjs(assignment.due_date)
          const notificationKey = `notified:${assignment.id}`
          const lastNotifyKey = `lastNotify:${assignment.id}`

          if (
            dueDate.isBefore(now) ||
            assignment.quiz_submission_is_submitted === 1
          ) {
            await storage.removeItems([
              `local:${notificationKey}`,
              `local:${lastNotifyKey}`,
            ])
            continue
          }

          if (dueDate.isAfter(reminderThreshold)) {
            continue
          }

          const lastNotifyTime = await storage.getItem<number>(
            `local:${lastNotifyKey}`
          )
          const timeSinceLastNotify = lastNotifyTime
            ? now.diff(lastNotifyTime, "hours")
            : reminderHours

          if (!lastNotifyTime || timeSinceLastNotify >= 24) {
            const readableDueDate = dueDate.format("D MMM YYYY [at] HH:mm")
            const dayUntilDue = dueDate.diff(now, "day")
            const dayUntilDueString =
              dayUntilDue === 0
                ? "today"
                : dayUntilDue === 1
                  ? "tomorrow"
                  : `in ${dayUntilDue} days`

            const notificationId = `assignment-${assignment.class_id}-${assignment.id}`

            const message = `${
              assignment.type === "ASM" ? "Assignment" : "Quiz"
            } "${assignment.title}" from ${
              classInfo.title || "Class"
            }\n\nDue ${dayUntilDueString} (${readableDueDate})`

            browser.notifications.create(notificationId, {
              type: "basic",
              iconUrl: "icons/128.png",
              title: `Due ${dayUntilDueString}: "${assignment.title}"`,
              message,
              buttons: [
                {
                  title: "View details",
                },
              ],
              priority: 2,
            })

            await storage.setItem(`local:${lastNotifyKey}`, now.valueOf())
          }
        }
      }
    } catch (error) {
      console.error("Error checking assignments:", error)
    }
  }

  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === browser.runtime.OnInstalledReason.INSTALL) {
      await storage.setItems([
        {
          key: "sync:notifications:enabled",
          value: true,
        },
        {
          key: "sync:notifications:reminderTime",
          value: "72",
        },
      ])
      browser.runtime.openOptionsPage()
    }
  })

  browser.alarms.create("checkAssignments", { periodInMinutes: 1 })

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "checkAssignments") {
      await checkUpcomingAssignments()
    }
  })

  browser.notifications.onButtonClicked.addListener((notificationId) => {
    if (notificationId.startsWith("assignment-")) {
      const [, classId, assignmentId] = notificationId.split("-")
      browser.tabs.create({
        url: `https://app.leb2.org/class/${classId}/activity/${assignmentId}`,
      })
    }
  })
})
