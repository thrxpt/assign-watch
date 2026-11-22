import { isSubmitted } from "@/lib/assignment";
import { getAssignmentKey, getEffectiveDueDate } from "@/lib/manual-due-dates";
import type { Assignment } from "@/types";

export const HOUR_IN_MS = 60 * 60 * 1000;
export const DAY_IN_MS = 24 * HOUR_IN_MS;

export type Timeframe = "24h" | "1h";
type NotifyFunction = (
  assignment: Assignment,
  timeframe: Timeframe
) => Promise<unknown>;

export interface DeadlineNotificationRecord {
  dueAt: number;
  day: boolean;
  hour: boolean;
}

export type DeadlineNotificationHistory = Record<
  string,
  DeadlineNotificationRecord
>;

interface ReviewDeadlineNotificationsParams {
  assignments: Assignment[];
  userId: string | null;
  history: DeadlineNotificationHistory | null;
  legacyNotifiedDay: number[];
  legacyNotifiedHour: number[];
  hiddenClasses: number[];
  hiddenAssignments: number[];
  now: Date;
  notify: NotifyFunction;
}

function sameNotificationRecord(
  previous: DeadlineNotificationRecord | undefined,
  next: DeadlineNotificationRecord
): boolean {
  return (
    previous?.dueAt === next.dueAt &&
    previous.day === next.day &&
    previous.hour === next.hour
  );
}

async function deliverReminder(
  assignment: Assignment,
  record: DeadlineNotificationRecord,
  now: number,
  notify: NotifyFunction
): Promise<void> {
  const remaining = record.dueAt - now;
  try {
    if (remaining <= HOUR_IN_MS) {
      if (!record.hour) {
        await notify(assignment, "1h");
        record.hour = true;
      }
      record.day = true;
    } else if (remaining <= DAY_IN_MS && !record.day) {
      await notify(assignment, "24h");
      record.day = true;
    }
  } catch {
    console.error("Failed to create deadline notification");
  }
}

export async function reviewDeadlineNotifications({
  assignments,
  userId,
  history,
  legacyNotifiedDay,
  legacyNotifiedHour,
  hiddenClasses,
  hiddenAssignments,
  now,
  notify,
}: ReviewDeadlineNotificationsParams) {
  const nextHistory = new Map(Object.entries(history ?? {}));
  const hiddenClassIds = new Set(hiddenClasses);
  const hiddenAssignmentIds = new Set(hiddenAssignments);
  const legacyDayIds = new Set(legacyNotifiedDay);
  const legacyHourIds = new Set(legacyNotifiedHour);
  const nowMs = now.getTime();
  let changed = history === null;

  for (const assignment of assignments) {
    if (
      hiddenClassIds.has(assignment.class_id) ||
      hiddenAssignmentIds.has(assignment.id)
    ) {
      continue;
    }
    const key = getAssignmentKey(userId, assignment);
    const dueDate = getEffectiveDueDate(assignment);
    const dueAt = dueDate ? new Date(dueDate).getTime() : Number.NaN;
    if (!Number.isFinite(dueAt) || dueAt <= nowMs || isSubmitted(assignment)) {
      if (nextHistory.has(key)) {
        nextHistory.delete(key);
        changed = true;
      }
      continue;
    }
    const previous = history?.[key];
    const sameDeadline = previous?.dueAt === dueAt;
    const adoptLegacy = history === null && Boolean(assignment.due_date);
    const record = {
      day: sameDeadline
        ? previous.day
        : adoptLegacy && legacyDayIds.has(assignment.id),
      dueAt,
      hour: sameDeadline
        ? previous.hour
        : adoptLegacy && legacyHourIds.has(assignment.id),
    };
    // Preserve delivery order and keep one browser creation in flight at a time.
    // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop
    await deliverReminder(assignment, record, nowMs, notify);
    if (!sameNotificationRecord(previous, record)) {
      nextHistory.set(key, record);
      changed = true;
    }
  }
  return { changed, history: Object.fromEntries(nextHistory) };
}
