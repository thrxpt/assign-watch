import { describe, expect, it, vi } from "vitest";

import {
  HOUR_IN_MS,
  reviewAssignment,
  reviewAssignments,
} from "@/lib/notification";
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

describe("notification logic", () => {
  const baseNow = new Date("2026-10-10T12:00:00Z");

  it("notifies 24h before due date", () => {
    const notify = vi.fn();
    const assignment = createMockActivity({
      due_date: new Date(baseNow.getTime() + 12 * HOUR_IN_MS).toISOString(),
      id: 42,
    });

    const state = {
      changedDay: false,
      changedHour: false,
      idsDay: new Set<number>(),
      idsHour: new Set<number>(),
    };

    reviewAssignment(assignment, state, baseNow, notify);

    expect(notify).toHaveBeenCalledWith(assignment, "24h");
    expect(state.idsDay.has(42)).toBe(true);
    expect(state.changedDay).toBe(true);
  });

  it("notifies 1h before due date", () => {
    const notify = vi.fn();
    const assignment = createMockActivity({
      due_date: new Date(baseNow.getTime() + 30 * 60 * 1000).toISOString(),
      id: 42,
    });

    const state = {
      changedDay: false,
      changedHour: false,
      idsDay: new Set<number>([42]),
      idsHour: new Set<number>(),
    };

    reviewAssignment(assignment, state, baseNow, notify);

    expect(notify).toHaveBeenCalledWith(assignment, "1h");
    expect(state.idsHour.has(42)).toBe(true);
    expect(state.changedHour).toBe(true);
  });

  it("does not re-notify if already notified in timeframe", () => {
    const notify = vi.fn();
    const assignment = createMockActivity({
      due_date: new Date(baseNow.getTime() + 30 * 60 * 1000).toISOString(),
      id: 42,
    });

    const state = {
      changedDay: false,
      changedHour: false,
      idsDay: new Set<number>([42]),
      idsHour: new Set<number>([42]),
    };

    reviewAssignment(assignment, state, baseNow, notify);

    expect(notify).not.toHaveBeenCalled();
    expect(state.changedDay).toBe(false);
    expect(state.changedHour).toBe(false);
  });

  it("clears notified ids if assignment is submitted", () => {
    const notify = vi.fn();
    const assignment = createMockActivity({
      activity_submission_id: 999,
      due_date: new Date(baseNow.getTime() + 10 * HOUR_IN_MS).toISOString(),
      id: 42,
    });

    const state = {
      changedDay: false,
      changedHour: false,
      idsDay: new Set<number>([42]),
      idsHour: new Set<number>([42]),
    };

    reviewAssignment(assignment, state, baseNow, notify);

    expect(notify).not.toHaveBeenCalled();
    expect(state.idsDay.has(42)).toBe(false);
    expect(state.idsHour.has(42)).toBe(false);
    expect(state.changedDay).toBe(true);
    expect(state.changedHour).toBe(true);
  });

  it("skips assignments without due_date", () => {
    const notify = vi.fn();
    const assignment = createMockActivity({
      due_date: "",
      id: 42,
    });

    const state = {
      changedDay: false,
      changedHour: false,
      idsDay: new Set<number>(),
      idsHour: new Set<number>(),
    };

    reviewAssignment(assignment, state, baseNow, notify);

    expect(notify).not.toHaveBeenCalled();
    expect(state.idsDay.has(42)).toBe(false);
  });

  it("reviewAssignments filters out hidden classes and hidden assignments", () => {
    const notify = vi.fn();
    const a1 = createMockActivity({
      class_id: 1,
      due_date: new Date(baseNow.getTime() + 2 * HOUR_IN_MS).toISOString(),
      id: 1,
    });
    const a2 = createMockActivity({
      class_id: 2,
      due_date: new Date(baseNow.getTime() + 2 * HOUR_IN_MS).toISOString(),
      id: 2,
    });
    const a3 = createMockActivity({
      class_id: 3,
      due_date: new Date(baseNow.getTime() + 2 * HOUR_IN_MS).toISOString(),
      id: 3,
    });

    const result = reviewAssignments({
      assignments: [a1, a2, a3],
      hiddenAssignments: [2],
      hiddenClasses: [1],
      notifiedDay: [],
      notifiedHour: [],
      notify,
      now: baseNow,
    });

    // a1 is in hiddenClass 1, a2 is in hiddenAssignment 2 -> only a3 notified
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(a3, "24h");
    expect(result.nextNotifiedDay).toEqual([3]);
    expect(result.changedDay).toBe(true);
  });
});
