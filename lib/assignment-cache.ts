import { browser } from "wxt/browser";

import type { Activity, ClassInfo, EnrollmentScope } from "@/types";

type EnrollmentToken = Pick<EnrollmentScope, "generation" | "userId">;

export interface PublishEnrollmentMessage {
  action: "publishEnrollment";
  classes: ClassInfo[] | null;
  userId: string;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isClassId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isClassInfo(value: unknown): value is ClassInfo {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    isClassId(value.id) &&
    "title" in value &&
    isNonemptyString(value.title) &&
    "description" in value &&
    typeof value.description === "string" &&
    "section" in value &&
    typeof value.section === "string" &&
    "semester" in value &&
    typeof value.semester === "string"
  );
}

export function isPublishEnrollmentMessage(
  value: unknown
): value is PublishEnrollmentMessage {
  if (
    !value ||
    typeof value !== "object" ||
    !("action" in value) ||
    value.action !== "publishEnrollment" ||
    !("userId" in value) ||
    !isNonemptyString(value.userId) ||
    !("classes" in value)
  ) {
    return false;
  }
  const { classes } = value;
  return (
    classes === null ||
    (Array.isArray(classes) &&
      classes.every(isClassInfo) &&
      new Set(classes.map(({ id }) => id)).size === classes.length)
  );
}

export interface CacheClassAssignmentsMessage extends EnrollmentToken {
  action: "cacheClassAssignments";
  assignments: Activity[];
  classId: number;
}

export class SupersededAssignmentRequestError extends Error {
  readonly generation: string;

  constructor(generation: string) {
    super("Assignment request was superseded by an enrollment change");
    this.generation = generation;
    this.name = "SupersededAssignmentRequestError";
  }
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
    !isClassId(value.classId) ||
    !("generation" in value) ||
    !isNonemptyString(value.generation) ||
    !("userId" in value) ||
    !isNonemptyString(value.userId) ||
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

/** A cached result is available to offline reminders before this resolves. */
export async function cacheClassAssignments(
  { generation, userId }: EnrollmentToken,
  classId: number,
  assignments: Activity[]
): Promise<"cached" | "discarded"> {
  const message: CacheClassAssignmentsMessage = {
    action: "cacheClassAssignments",
    assignments,
    classId,
    generation,
    userId,
  };
  const result: unknown = await browser.runtime.sendMessage(message);
  if (result && typeof result === "object" && "ok" in result) {
    if (result.ok === true) {
      return "cached";
    }
    if (
      result.ok === false &&
      "discarded" in result &&
      result.discarded === true
    ) {
      return "discarded";
    }
  }
  throw new Error("Could not cache class assignments for reminders");
}
