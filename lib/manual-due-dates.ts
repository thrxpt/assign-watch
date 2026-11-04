import { format } from "date-fns";

import type { Activity, Assignment, AssignmentSnapshot } from "@/types";

export type ManualDueDates = Record<string, string>;

export function getAssignmentKey(
  userId: string | null,
  assignment: Pick<Activity, "class_id" | "id">
): string {
  return JSON.stringify([userId, assignment.class_id, assignment.id]);
}

export function getEffectiveDueDate(assignment: Assignment): string | null {
  return assignment.due_date || assignment.manualDueDate || null;
}

export function hasManualDueDate(assignment: Assignment): boolean {
  return !assignment.due_date && Boolean(assignment.manualDueDate);
}

export function resolveAssignment(
  assignment: Activity,
  userId: string | null,
  manualDueDates: ManualDueDates
): Assignment {
  const manualDueDate = userId
    ? manualDueDates[getAssignmentKey(userId, assignment)]
    : undefined;
  return { ...assignment, manualDueDate };
}

/** Old caches have no trusted account identity, so never apply manual dates to them. */
export function readAssignmentSnapshot(
  value: Activity[] | AssignmentSnapshot
): AssignmentSnapshot {
  return Array.isArray(value) ? { assignments: value, userId: null } : value;
}

export function toLocalDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function parseLocalDateTime(value: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || toLocalDateTime(date) !== value) {
    return null;
  }
  return date.toISOString();
}
