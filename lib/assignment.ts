import type { Activity } from "@/types";

type Status =
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

export function getAssignmentUrl(assignment: Activity) {
  const typePath = assignment.type === "ASM" ? "activity" : "quiz";
  return `https://app.leb2.org/class/${assignment.class_id}/${typePath}/${assignment.id}`;
}
