import { isSubmitted } from "@/lib/assignment";
import { getAssignmentKey, getEffectiveDueDate } from "@/lib/manual-due-dates";
import type { Activity, Assignment } from "@/types";

export const HOUR_IN_MS = 60 * 60 * 1000;
export const DAY_IN_MS = 24 * HOUR_IN_MS;

export const DUE_SOON_MESSAGES = {
  "1h": "is due in less than 1 hour.",
  "24h": "is due in less than 24 hours.",
} as const;

export interface NotifiedState {
  changedDay: boolean;
  changedHour: boolean;
  idsDay: Set<number>;
  idsHour: Set<number>;
}

export type Timeframe = "24h" | "1h";
export type NotifyFunction = (
  assignment: Assignment,
  timeframe: Timeframe
) => void;

export const reviewAssignment = (
  assignment: Assignment,
  state: NotifiedState,
  now: Date,
  notify: NotifyFunction
): void => {
  if (isSubmitted(assignment)) {
    state.changedDay = state.idsDay.delete(assignment.id) || state.changedDay;
    state.changedHour =
      state.idsHour.delete(assignment.id) || state.changedHour;
    return;
  }

  const dueDateValue = getEffectiveDueDate(assignment);
  if (!dueDateValue) {
    return;
  }

  const dueDate = new Date(dueDateValue);
  if (dueDate <= now) {
    state.changedDay = state.idsDay.delete(assignment.id) || state.changedDay;
    state.changedHour =
      state.idsHour.delete(assignment.id) || state.changedHour;
    return;
  }

  const dueWithinHour = dueDate.getTime() - now.getTime() <= HOUR_IN_MS;
  const dueWithinDay = dueDate.getTime() - now.getTime() <= DAY_IN_MS;

  if (dueWithinHour) {
    if (!state.idsHour.has(assignment.id)) {
      notify(assignment, "1h");
      state.idsHour.add(assignment.id);
      state.changedHour = true;
    }
    if (!state.idsDay.has(assignment.id)) {
      state.idsDay.add(assignment.id);
      state.changedDay = true;
    }
  } else if (dueWithinDay && !state.idsDay.has(assignment.id)) {
    notify(assignment, "24h");
    state.idsDay.add(assignment.id);
    state.changedDay = true;
  }
};

export interface ReviewAssignmentsParams {
  assignments: Activity[];
  hiddenClasses: number[];
  hiddenAssignments: number[];
  notifiedDay: number[];
  notifiedHour: number[];
  now: Date;
  notify: NotifyFunction;
}

export interface ReviewAssignmentsResult {
  nextNotifiedDay: number[];
  nextNotifiedHour: number[];
  changedDay: boolean;
  changedHour: boolean;
}

export const reviewAssignments = ({
  assignments,
  hiddenClasses,
  hiddenAssignments,
  notifiedDay,
  notifiedHour,
  now,
  notify,
}: ReviewAssignmentsParams): ReviewAssignmentsResult => {
  const hiddenClassSet = new Set(hiddenClasses);
  const hiddenAssignmentSet = new Set(hiddenAssignments);

  const state: NotifiedState = {
    changedDay: false,
    changedHour: false,
    idsDay: new Set(notifiedDay),
    idsHour: new Set(notifiedHour),
  };

  for (const assignment of assignments) {
    if (
      hiddenClassSet.has(assignment.class_id) ||
      hiddenAssignmentSet.has(assignment.id)
    ) {
      continue;
    }
    reviewAssignment(assignment, state, now, notify);
  }

  return {
    changedDay: state.changedDay,
    changedHour: state.changedHour,
    nextNotifiedDay: [...state.idsDay],
    nextNotifiedHour: [...state.idsHour],
  };
};

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

export function reviewDeadlineNotifications({
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
    if (
      !Number.isFinite(dueAt) ||
      dueAt <= now.getTime() ||
      isSubmitted(assignment)
    ) {
      if (nextHistory.has(key)) {
        nextHistory.delete(key);
        changed = true;
      }
      continue;
    }
    const previous = history?.[key];
    const sameDeadline = previous?.dueAt === dueAt;
    const adoptLegacy = history === null && Boolean(assignment.due_date);
    const daySent = sameDeadline
      ? previous.day
      : adoptLegacy && legacyDayIds.has(assignment.id);
    const hourSent = sameDeadline
      ? previous.hour
      : adoptLegacy && legacyHourIds.has(assignment.id);
    const state: NotifiedState = {
      changedDay: false,
      changedHour: false,
      idsDay: new Set(daySent ? [assignment.id] : []),
      idsHour: new Set(hourSent ? [assignment.id] : []),
    };
    reviewAssignment(assignment, state, now, notify);
    const record = {
      day: state.idsDay.has(assignment.id),
      dueAt,
      hour: state.idsHour.has(assignment.id),
    };
    if (!sameNotificationRecord(previous, record)) {
      nextHistory.set(key, record);
      changed = true;
    }
  }
  return { changed, history: Object.fromEntries(nextHistory) };
}
