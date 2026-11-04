import { browser } from "wxt/browser";

import type { Activity } from "@/types";

export interface ManualDueDateMessage {
  action: "setManualDueDate";
  userId: string;
  classId: number;
  assignmentId: number;
  dueDate: string | null;
}

export function isManualDueDateMessage(
  value: unknown
): value is ManualDueDateMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    "action" in value &&
    value.action === "setManualDueDate" &&
    "userId" in value &&
    typeof value.userId === "string" &&
    value.userId.trim().length > 0 &&
    "classId" in value &&
    typeof value.classId === "number" &&
    Number.isSafeInteger(value.classId) &&
    value.classId > 0 &&
    "assignmentId" in value &&
    typeof value.assignmentId === "number" &&
    Number.isSafeInteger(value.assignmentId) &&
    value.assignmentId > 0 &&
    "dueDate" in value &&
    (value.dueDate === null ||
      (typeof value.dueDate === "string" &&
        Number.isFinite(new Date(value.dueDate).getTime())))
  );
}

export async function saveManualDueDate(
  userId: string,
  assignment: Pick<Activity, "class_id" | "id">,
  dueDate: string | null
): Promise<void> {
  const message: ManualDueDateMessage = {
    action: "setManualDueDate",
    assignmentId: assignment.id,
    classId: assignment.class_id,
    dueDate,
    userId,
  };
  const result: unknown = await browser.runtime.sendMessage(message);
  if (
    !result ||
    typeof result !== "object" ||
    !("ok" in result) ||
    result.ok !== true
  ) {
    throw new Error("Could not save the manual due date");
  }
}
