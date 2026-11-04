import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";

import background from "@/entrypoints/background";
import { readAssignmentSnapshot } from "@/lib/manual-due-dates";
import {
  cachedAssignmentsStorage,
  deadlineNotificationHistoryStorage,
  userIdStorage,
} from "@/lib/storage";
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

const drainChecks = async () => {
  await fakeBrowser.alarms.onAlarm.trigger({
    name: "reviewCachedAssignments",
    scheduledTime: Date.now(),
  });
};

beforeEach(() => {
  fakeBrowser.reset();
  background.main();
});
afterEach(async () => {
  await drainChecks();
  vi.restoreAllMocks();
});

it("sends a manual deadline reminder when another class has not loaded", async () => {
  const notify = vi.spyOn(browser.notifications, "create").mockResolvedValue();
  await userIdStorage.setValue("student-a");
  const assignment = createMockActivity({
    class_id: 10,
    due_date: null,
    id: 101,
  });
  await fakeBrowser.runtime.onMessage.trigger(
    {
      action: "cacheClassAssignments",
      assignments: [assignment],
      classId: 10,
      classIds: [10, 20],
      userId: "student-a",
    },
    {}
  );
  await fakeBrowser.runtime.onMessage.trigger(
    {
      action: "setManualDueDate",
      assignmentId: 101,
      classId: 10,
      dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      userId: "student-a",
    },
    {}
  );
  await drainChecks();
  expect(notify).toHaveBeenCalledTimes(1);
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
  ).toEqual({ assignments: [assignment], userId: "student-a" });
  const history = await deadlineNotificationHistoryStorage.getValue();
  expect(history?.['["student-a",10,101]']?.hour).toBe(true);
});

it("retains the cached records of failed classes and replaces successful classes", async () => {
  const oldA = createMockActivity({ class_id: 10, due_date: null, id: 1 });
  const oldB = createMockActivity({ class_id: 20, due_date: null, id: 2 });
  const freshA = createMockActivity({ class_id: 10, due_date: null, id: 3 });
  await cachedAssignmentsStorage.setValue({
    assignments: [oldA, oldB],
    userId: "student-a",
  });
  await fakeBrowser.runtime.onMessage.trigger(
    {
      action: "cacheClassAssignments",
      assignments: [freshA],
      classId: 10,
      classIds: [10, 20],
      userId: "student-a",
    },
    {}
  );
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
      .assignments
  ).toEqual([oldB, freshA]);
  await fakeBrowser.runtime.onMessage.trigger(
    {
      action: "cacheClassAssignments",
      assignments: [],
      classId: 10,
      classIds: [10, 20],
      userId: "student-a",
    },
    {}
  );
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
      .assignments
  ).toEqual([oldB]);
});

it("does not mix records belonging to different student accounts", async () => {
  const old = createMockActivity({ class_id: 10, due_date: null });
  const fresh = createMockActivity({ class_id: 20, due_date: null });
  await cachedAssignmentsStorage.setValue({
    assignments: [old],
    userId: "student-a",
  });
  await fakeBrowser.runtime.onMessage.trigger(
    {
      action: "cacheClassAssignments",
      assignments: [fresh],
      classId: 20,
      classIds: [10, 20],
      userId: "student-b",
    },
    {}
  );
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [fresh],
    userId: "student-b",
  });
});

it("serializes concurrent successful class updates without losing either result", async () => {
  const a = createMockActivity({ class_id: 10, due_date: null, id: 1 });
  const b = createMockActivity({ class_id: 20, due_date: null, id: 2 });
  await Promise.all([
    fakeBrowser.runtime.onMessage.trigger(
      {
        action: "cacheClassAssignments",
        assignments: [a],
        classId: 10,
        classIds: [10, 20],
        userId: "student-a",
      },
      {}
    ),
    fakeBrowser.runtime.onMessage.trigger(
      {
        action: "cacheClassAssignments",
        assignments: [b],
        classId: 20,
        classIds: [10, 20],
        userId: "student-a",
      },
      {}
    ),
  ]);
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
      .assignments
  ).toEqual([a, b]);
});

it("drops records for classes no longer enrolled", async () => {
  const retired = createMockActivity({ class_id: 30, due_date: null, id: 1 });
  const current = createMockActivity({ class_id: 10, due_date: null, id: 2 });
  await cachedAssignmentsStorage.setValue({
    assignments: [retired],
    userId: "student-a",
  });
  await fakeBrowser.runtime.onMessage.trigger(
    {
      action: "cacheClassAssignments",
      assignments: [current],
      classId: 10,
      classIds: [10],
      userId: "student-a",
    },
    {}
  );
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
      .assignments
  ).toEqual([current]);
});

it("rejects mismatched classes and resolved manual dates at the raw-cache boundary", async () => {
  const raw = createMockActivity({ class_id: 10, due_date: null });
  const message = {
    action: "cacheClassAssignments",
    assignments: [raw],
    classId: 10,
    classIds: [10],
    userId: "student-a",
  };
  await fakeBrowser.runtime.onMessage.trigger(
    { ...message, assignments: [{ ...raw, class_id: 20 }] },
    {}
  );
  await fakeBrowser.runtime.onMessage.trigger(
    {
      ...message,
      assignments: [{ ...raw, manualDueDate: "2030-01-01T00:00:00Z" }],
    },
    {}
  );
  await fakeBrowser.runtime.onMessage.trigger(
    { ...message, classIds: [20] },
    {}
  );
  expect(await cachedAssignmentsStorage.getValue()).toEqual([]);
});
