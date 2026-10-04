import { isSubmitted } from "@/lib/assignment";
import type { Activity } from "@/types";

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
  assignment: Activity,
  timeframe: Timeframe
) => void;

export const reviewAssignment = (
  assignment: Activity,
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

  if (!assignment.due_date) {
    return;
  }

  const dueDate = new Date(assignment.due_date);
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
