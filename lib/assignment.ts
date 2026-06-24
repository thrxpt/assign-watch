import type { Activity } from "@/types";

export type Status =
  | "submitted"
  | "not_submitted"
  | "in_progress"
  | "submitted_late"
  | "quiz_not_submitted";

export function getSubmissionStatus(assignment: Activity): Status {
  if (assignment.activity_submission_id) {
    if (assignment.activity_submission_is_late) {
      return "submitted_late";
    }
    if (assignment.quiz_submission_is_submitted === 0) {
      return "quiz_not_submitted";
    }
    return "submitted";
  }
  if (assignment.due_date_exceed) {
    return "not_submitted";
  }
  return "in_progress";
}

export function getAssignmentUrl(
  assignment: Pick<Activity, "type" | "class_id" | "id">
) {
  const typePath = assignment.type === "ASM" ? "activity" : "quiz";
  return `https://app.leb2.org/class/${assignment.class_id}/${typePath}/${assignment.id}`;
}

// Left accent-bar color used by the list view assignment card.
const STATUS_BAR_COLOR: Partial<Record<Status, string>> = {
  submitted: "after:bg-green-500/70",
  not_submitted: "after:bg-red-500/70",
  in_progress: "after:bg-neutral-500/70",
  quiz_not_submitted: "after:bg-amber-500/70",
};

export function getStatusBarColor(assignment: Activity) {
  return STATUS_BAR_COLOR[getSubmissionStatus(assignment)];
}

// Chip color used by the calendar view.
const STATUS_CALENDAR_COLOR: Partial<Record<Status, string>> = {
  submitted:
    "border-green-200 bg-green-100 text-green-700 hover:bg-green-200 [&>div:first-child]:text-green-700 [&>div:last-child]:text-green-700/80",
  submitted_late:
    "border-orange-200 bg-orange-100 text-orange-700 hover:bg-orange-200 [&>div:first-child]:text-orange-700 [&>div:last-child]:text-orange-700/80",
  not_submitted:
    "border-red-200 bg-red-100 text-red-700 hover:bg-red-200 [&>div:first-child]:text-red-700 [&>div:last-child]:text-red-700/80",
  in_progress:
    "border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 [&>div:first-child]:text-neutral-700 [&>div:last-child]:text-neutral-700/80",
  quiz_not_submitted:
    "border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200 [&>div:first-child]:text-amber-700 [&>div:last-child]:text-amber-700/80",
};

export function getStatusCalendarColor(assignment: Activity) {
  return STATUS_CALENDAR_COLOR[getSubmissionStatus(assignment)];
}

// Text color for the relative-due-date badge (late / today / upcoming).
export function getRelativeStatusColor(status: "late" | "today" | "upcoming") {
  if (status === "late") {
    return "text-red-600";
  }
  if (status === "today") {
    return "text-yellow-600";
  }
  return "text-green-600";
}
