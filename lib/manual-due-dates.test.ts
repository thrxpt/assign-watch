import { afterEach, describe, expect, it, vi } from "vitest";

import { isManualDueDateMessage } from "@/lib/manual-due-date-storage";
import {
  getAssignmentKey,
  getEffectiveDueDate,
  hasManualDueDate,
  parseLocalDateTime,
  readAssignmentSnapshot,
  resolveAssignment,
  toLocalDateTime,
} from "@/lib/manual-due-dates";
import type { Activity } from "@/types";

function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    activity_group_id: null,
    activity_group_name: null,
    activity_submission_id: 0,
    activity_submission_is_late: false,
    activity_submission_submitted_at: {
      date: "2026-09-11 10:00:00.000000",
      timezone: "Asia/Bangkok",
      timezone_type: 3,
    },
    adv_starred: 0,
    class_id: 101,
    class_user_id: 1,
    count_group_member: 1,
    created_at: "2026-09-01T00:00:00Z",
    description: "Test description",
    due_date: "2026-10-15T23:59:59Z",
    due_date_exceed: false,
    edit_group_mode: "none",
    fileactivities: [],
    group_type: "IND",
    id: 1,
    is_allow_repeat: 0,
    peer_assessment: 0,
    questions: [],
    quiz_submission_is_submitted: 1,
    start_date: "2026-09-01T00:00:00Z",
    title: "Test Activity",
    type: "ASM",
    user: 1,
    user_id: 1,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("manual due dates", () => {
  const manualDate = "2026-11-10T16:59:00.000Z";
  const raw = createMockActivity({ due_date: null });
  it("isolates dates by account, class, and assignment without changing the raw response", () => {
    const dates = { [getAssignmentKey("student-a", raw)]: manualDate };
    expect(
      getEffectiveDueDate(resolveAssignment(raw, "student-a", dates))
    ).toBe(manualDate);
    expect(
      getEffectiveDueDate(resolveAssignment(raw, "student-b", dates))
    ).toBeNull();
    expect(getEffectiveDueDate(resolveAssignment(raw, null, dates))).toBeNull();
    expect(
      getEffectiveDueDate(
        resolveAssignment({ ...raw, class_id: 999 }, "student-a", dates)
      )
    ).toBeNull();
    expect(
      getEffectiveDueDate(
        resolveAssignment({ ...raw, id: 999 }, "student-a", dates)
      )
    ).toBeNull();
    expect(raw.due_date).toBeNull();
    expect(raw).not.toHaveProperty("manualDueDate");
  });
  it("uses an official date while preserving the manual fallback", () => {
    const dates = { [getAssignmentKey("a", raw)]: manualDate };
    const officialDate = "2026-12-01T00:00:00Z";
    const resolved = resolveAssignment(
      { ...raw, due_date: officialDate },
      "a",
      dates
    );
    expect(getEffectiveDueDate(resolved)).toBe(officialDate);
    expect(hasManualDueDate(resolved)).toBe(false);
    expect(resolved.manualDueDate).toBe(manualDate);
    expect(getEffectiveDueDate(resolveAssignment(raw, "a", dates))).toBe(
      manualDate
    );
    expect(hasManualDueDate(resolveAssignment(raw, "a", dates))).toBe(true);
  });
  it("keeps legacy caches unowned", () => {
    expect(readAssignmentSnapshot([raw])).toEqual({
      assignments: [raw],
      userId: null,
    });
    const snapshot = { assignments: [raw], userId: "a" };
    expect(readAssignmentSnapshot(snapshot)).toBe(snapshot);
  });
  it("converts local input to a fixed instant and displays it in the current timezone", () => {
    vi.stubEnv("TZ", "Asia/Bangkok");
    expect(parseLocalDateTime("2026-11-10T23:59")).toBe(manualDate);
    vi.stubEnv("TZ", "UTC");
    expect(toLocalDateTime(new Date(manualDate))).toBe("2026-11-10T16:59");
  });
  it("accepts past deadlines but rejects invalid and nonexistent local times", () => {
    vi.stubEnv("TZ", "America/New_York");
    expect(parseLocalDateTime("2020-01-01T23:59")).not.toBeNull();
    expect(parseLocalDateTime("2026-03-08T02:30")).toBeNull();
    expect(parseLocalDateTime("2026-02-30T23:59")).toBeNull();
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("bad date")).toBeNull();
  });
  it("validates messages before persisting a date", () => {
    const message = {
      action: "setManualDueDate",
      assignmentId: 2,
      classId: 1,
      dueDate: manualDate,
      userId: "a",
    };
    expect(isManualDueDateMessage(message)).toBe(true);
    expect(isManualDueDateMessage({ ...message, dueDate: null })).toBe(true);
    expect(isManualDueDateMessage({ ...message, dueDate: "bad date" })).toBe(
      false
    );
    expect(isManualDueDateMessage({ ...message, userId: "" })).toBe(false);
    expect(isManualDueDateMessage({ ...message, classId: -1 })).toBe(false);
    expect(isManualDueDateMessage({ ...message, assignmentId: 2.5 })).toBe(
      false
    );
  });
});
