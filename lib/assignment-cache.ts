import { browser } from "wxt/browser";

import type { Activity } from "@/types";

export interface CacheClassAssignmentsMessage {
  action: "cacheClassAssignments";
  assignments: Activity[];
  classId: number;
  classIds: number[];
  userId: string | null;
}

export function isCacheClassAssignmentsMessage(
  value: unknown
): value is CacheClassAssignmentsMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (
    !("action" in value) ||
    value.action !== "cacheClassAssignments" ||
    !("classId" in value) ||
    typeof value.classId !== "number" ||
    !Number.isSafeInteger(value.classId) ||
    value.classId <= 0 ||
    !("classIds" in value) ||
    !Array.isArray(value.classIds) ||
    !value.classIds.every(
      (classId: unknown) =>
        typeof classId === "number" &&
        Number.isSafeInteger(classId) &&
        classId > 0
    ) ||
    !value.classIds.includes(value.classId) ||
    !("userId" in value) ||
    !(
      value.userId === null ||
      (typeof value.userId === "string" && value.userId.trim().length > 0)
    ) ||
    !("assignments" in value) ||
    !Array.isArray(value.assignments)
  ) {
    return false;
  }
  return value.assignments.every((assignment: unknown) => {
    if (!assignment || typeof assignment !== "object") {
      return false;
    }
    return (
      "class_id" in assignment &&
      assignment.class_id === value.classId &&
      "id" in assignment &&
      typeof assignment.id === "number" &&
      Number.isSafeInteger(assignment.id) &&
      assignment.id > 0 &&
      "title" in assignment &&
      typeof assignment.title === "string" &&
      "type" in assignment &&
      (assignment.type === "ASM" || assignment.type === "QUZ") &&
      "due_date" in assignment &&
      (assignment.due_date === null ||
        typeof assignment.due_date === "string") &&
      !("manualDueDate" in assignment)
    );
  });
}

/** Resolve only after raw assignments are available to offline reminders. */
export async function cacheClassAssignments(
  userId: string | null,
  classId: number,
  assignments: Activity[],
  classIds: number[]
): Promise<void> {
  const message: CacheClassAssignmentsMessage = {
    action: "cacheClassAssignments",
    assignments,
    classId,
    classIds,
    userId,
  };
  const result: unknown = await browser.runtime.sendMessage(message);
  if (
    !result ||
    typeof result !== "object" ||
    !("ok" in result) ||
    result.ok !== true
  ) {
    throw new Error("Could not cache class assignments for reminders");
  }
}
