import { describe, expect, it, vi } from "vitest";

import { getAssignmentKey } from "@/lib/manual-due-dates";
import { HOUR_IN_MS, reviewDeadlineNotifications } from "@/lib/notification";
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

  it("rearms changed manual deadlines and suppresses unchanged deadlines across sources", async () => {
    const notify = vi.fn(() => Promise.resolve());
    const manual = {
      ...createMockActivity({ due_date: null }),
      manualDueDate: new Date(baseNow.getTime() + 30 * 60 * 1000).toISOString(),
    };
    const params = {
      assignments: [manual],
      hiddenAssignments: [],
      hiddenClasses: [],
      history: null,
      legacyNotifiedDay: [],
      legacyNotifiedHour: [],
      notify,
      now: baseNow,
      userId: "a",
    };
    const first = await reviewDeadlineNotifications(params);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenLastCalledWith(manual, "1h");
    const repeated = await reviewDeadlineNotifications({
      ...params,
      history: first.history,
    });
    expect(repeated.changed).toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);
    const official = { ...manual, due_date: manual.manualDueDate };
    await reviewDeadlineNotifications({
      ...params,
      assignments: [official],
      history: first.history,
    });
    expect(notify).toHaveBeenCalledTimes(1);
    const later = {
      ...manual,
      manualDueDate: new Date(
        baseNow.getTime() + 12 * HOUR_IN_MS
      ).toISOString(),
    };
    const edited = await reviewDeadlineNotifications({
      ...params,
      assignments: [later],
      history: first.history,
    });
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenLastCalledWith(later, "24h");
    await reviewDeadlineNotifications({
      ...params,
      assignments: [later],
      history: edited.history,
    });
    expect(notify).toHaveBeenCalledTimes(2);
    const removed = await reviewDeadlineNotifications({
      ...params,
      assignments: [{ ...manual, manualDueDate: undefined }],
      history: edited.history,
    });
    expect(removed.history).not.toHaveProperty(getAssignmentKey("a", manual));
    await reviewDeadlineNotifications({ ...params, history: removed.history });
    expect(notify).toHaveBeenCalledTimes(3);
  });

  it("scopes reminder history by student and retains each student's sent state", async () => {
    const notify = vi.fn(() => Promise.resolve());
    const assignment = {
      ...createMockActivity({ due_date: null }),
      manualDueDate: new Date(baseNow.getTime() + HOUR_IN_MS).toISOString(),
    };
    const params = {
      assignments: [assignment],
      hiddenAssignments: [],
      hiddenClasses: [],
      history: null,
      legacyNotifiedDay: [],
      legacyNotifiedHour: [],
      notify,
      now: baseNow,
      userId: "a",
    };
    const first = await reviewDeadlineNotifications(params);
    const second = await reviewDeadlineNotifications({
      ...params,
      history: first.history,
      userId: "b",
    });
    await reviewDeadlineNotifications({ ...params, history: second.history });
    expect(notify).toHaveBeenCalledTimes(2);
    expect(Object.keys(second.history)).toHaveLength(2);
  });

  it("preserves existing LEB2 reminder history on first evaluation", async () => {
    const notify = vi.fn(() => Promise.resolve());
    const assignment = createMockActivity({
      due_date: new Date(baseNow.getTime() + HOUR_IN_MS).toISOString(),
    });
    await reviewDeadlineNotifications({
      assignments: [assignment],
      hiddenAssignments: [],
      hiddenClasses: [],
      history: null,
      legacyNotifiedDay: [assignment.id],
      legacyNotifiedHour: [assignment.id],
      notify,
      now: baseNow,
      userId: null,
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not notify past, submitted, or hidden manual deadlines", async () => {
    const notify = vi.fn(() => Promise.resolve());
    const assignment = {
      ...createMockActivity({ due_date: null }),
      manualDueDate: new Date(baseNow.getTime() + HOUR_IN_MS).toISOString(),
    };
    const params = {
      hiddenAssignments: [],
      hiddenClasses: [],
      history: null,
      legacyNotifiedDay: [],
      legacyNotifiedHour: [],
      notify,
      now: baseNow,
      userId: "a",
    };
    await reviewDeadlineNotifications({
      ...params,
      assignments: [{ ...assignment, manualDueDate: baseNow.toISOString() }],
    });
    await reviewDeadlineNotifications({
      ...params,
      assignments: [{ ...assignment, activity_submission_id: 10 }],
    });
    await reviewDeadlineNotifications({
      ...params,
      assignments: [assignment],
      hiddenAssignments: [assignment.id],
    });
    await reviewDeadlineNotifications({
      ...params,
      assignments: [assignment],
      hiddenClasses: [assignment.class_id],
    });
    expect(notify).not.toHaveBeenCalled();
  });

  const review = (
    assignments: Activity[],
    overrides: Partial<Parameters<typeof reviewDeadlineNotifications>[0]> = {}
  ) =>
    reviewDeadlineNotifications({
      assignments,
      hiddenAssignments: [],
      hiddenClasses: [],
      history: {},
      legacyNotifiedDay: [],
      legacyNotifiedHour: [],
      notify: vi.fn(() => Promise.resolve()),
      now: baseNow,
      userId: "a",
      ...overrides,
    });

  it("notifies 24h before the deadline", async () => {
    const notify = vi.fn(() => Promise.resolve());
    const dueAt = baseNow.getTime() + 12 * HOUR_IN_MS;
    const assignment = createMockActivity({
      due_date: new Date(dueAt).toISOString(),
    });

    const result = await review([assignment], { notify });

    expect(notify).toHaveBeenCalledExactlyOnceWith(assignment, "24h");
    expect(result.changed).toBe(true);
    expect(result.history[getAssignmentKey("a", assignment)]).toEqual({
      day: true,
      dueAt,
      hour: false,
    });
  });

  it.each([true, false])(
    "accepts a one-hour reminder with prior day flag %j and sends it once",
    async (day) => {
      const notify = vi.fn(() => Promise.resolve());
      const dueAt = baseNow.getTime() + HOUR_IN_MS;
      const assignment = createMockActivity({
        due_date: new Date(dueAt).toISOString(),
      });
      const key = getAssignmentKey("a", assignment);
      const result = await review([assignment], {
        history: { [key]: { day, dueAt, hour: false } },
        notify,
      });

      expect(result.changed).toBe(true);
      expect(result.history[key]).toEqual({ day: true, dueAt, hour: true });
      const repeated = await review([assignment], {
        history: result.history,
        notify,
      });
      expect(repeated.changed).toBe(false);
      expect(notify).toHaveBeenCalledExactlyOnceWith(assignment, "1h");
    }
  );

  it.each([true, false])(
    "preserves prior day flag %j on one-hour rejection and retries later",
    async (day) => {
      const notify = vi
        .fn(() => Promise.resolve())
        .mockRejectedValueOnce(new Error("Browser rejected notification"));
      const dueAt = baseNow.getTime() + HOUR_IN_MS;
      const assignment = createMockActivity({
        due_date: new Date(dueAt).toISOString(),
      });
      const key = getAssignmentKey("a", assignment);
      const history = { [key]: { day, dueAt, hour: false } };
      const logError = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const failed = await review([assignment], { history, notify });

        expect(logError).toHaveBeenCalledExactlyOnceWith(
          "Failed to create deadline notification"
        );
        expect(notify).toHaveBeenCalledExactlyOnceWith(assignment, "1h");
        expect(failed).toEqual({ changed: false, history });

        const retried = await review([assignment], {
          history: failed.history,
          notify,
        });
        expect(notify).toHaveBeenCalledTimes(2);
        expect(notify).toHaveBeenLastCalledWith(assignment, "1h");
        expect(retried.changed).toBe(true);
        expect(retried.history[key]).toEqual({ day: true, dueAt, hour: true });
      } finally {
        logError.mockRestore();
      }
    }
  );

  it("clears reminder history when an assignment is submitted", async () => {
    const notify = vi.fn(() => Promise.resolve());
    const dueAt = baseNow.getTime() + 10 * HOUR_IN_MS;
    const assignment = createMockActivity({
      activity_submission_id: 999,
      due_date: new Date(dueAt).toISOString(),
    });
    const key = getAssignmentKey("a", assignment);

    const result = await review([assignment], {
      history: { [key]: { day: true, dueAt, hour: true } },
      notify,
    });

    expect(notify).not.toHaveBeenCalled();
    expect(result).toEqual({ changed: true, history: {} });
  });

  it.each([null, ""])(
    "skips assignments without due_date (%j)",
    async (dueDate) => {
      const notify = vi.fn(() => Promise.resolve());
      const assignment = createMockActivity({ due_date: dueDate });

      const result = await review([assignment], { notify });

      expect(notify).not.toHaveBeenCalled();
      expect(result).toEqual({ changed: false, history: {} });
    }
  );

  it("filters out hidden classes and hidden assignments", async () => {
    const notify = vi.fn(() => Promise.resolve());
    const dueAt = baseNow.getTime() + 2 * HOUR_IN_MS;
    const date = new Date(dueAt).toISOString();
    const hiddenClass = createMockActivity({
      class_id: 1,
      due_date: date,
      id: 1,
    });
    const hiddenAssignment = createMockActivity({
      class_id: 2,
      due_date: date,
      id: 2,
    });
    const visible = createMockActivity({ class_id: 3, due_date: date, id: 3 });

    const result = await review([hiddenClass, hiddenAssignment, visible], {
      hiddenAssignments: [hiddenAssignment.id],
      hiddenClasses: [hiddenClass.class_id],
      notify,
    });

    expect(notify).toHaveBeenCalledExactlyOnceWith(visible, "24h");
    expect(result.history).toEqual({
      [getAssignmentKey("a", visible)]: { day: true, dueAt, hour: false },
    });
    expect(result.changed).toBe(true);
  });
});
