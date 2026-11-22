import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";

import background from "@/entrypoints/background";
import {
  getAssignmentKey,
  readAssignmentSnapshot,
} from "@/lib/manual-due-dates";
import { HOUR_IN_MS } from "@/lib/notification";
import {
  cachedAssignmentsStorage,
  deadlineNotificationHistoryStorage,
  languageStorage,
  manualDueDatesStorage,
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

const spyOnMessageRegistration = () =>
  vi.spyOn(browser.runtime.onMessage, "addListener");

let messageRegistration: ReturnType<typeof spyOnMessageRegistration>;

const dispatchMessage = (
  message: unknown,
  sendResponse: (response: unknown) => void
) => {
  expect(messageRegistration).toHaveBeenCalledTimes(1);
  const listener = messageRegistration.mock.calls[0]?.[0];
  return listener?.(message, {}, sendResponse);
};

const sendMessage = async (message: unknown): Promise<unknown> => {
  const { promise, resolve } = Promise.withResolvers<unknown>();
  const sendResponse = vi.fn(resolve);
  expect(dispatchMessage(message, sendResponse)).toBe(true);
  const response = await promise;
  expect(sendResponse).toHaveBeenCalledTimes(1);
  return response;
};

beforeEach(() => {
  fakeBrowser.reset();
  messageRegistration = spyOnMessageRegistration();
});
afterEach(async () => {
  await drainChecks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("opens the options tab when the runtime options API fails", async () => {
  background.main();
  const openOptions = vi
    .spyOn(browser.runtime, "openOptionsPage")
    .mockRejectedValue(new Error("Options API unavailable"));
  const createTab = vi.spyOn(browser.tabs, "create");

  expect(await sendMessage({ action: "openOptionsPage" })).toEqual({
    ok: true,
  });
  expect(openOptions).toHaveBeenCalledTimes(1);
  expect(createTab).toHaveBeenCalledExactlyOnceWith({
    url: browser.runtime.getURL("/options.html"),
  });
});

it("sends a manual deadline reminder when another class has not loaded", async () => {
  background.main();
  const notify = vi.spyOn(browser.notifications, "create").mockResolvedValue();
  await userIdStorage.setValue("student-a");
  const assignment = createMockActivity({
    class_id: 10,
    due_date: null,
    id: 101,
  });
  await sendMessage({
    action: "cacheClassAssignments",
    assignments: [assignment],
    classId: 10,
    classIds: [10, 20],
    userId: "student-a",
  });
  await sendMessage({
    action: "setManualDueDate",
    assignmentId: 101,
    classId: 10,
    dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    userId: "student-a",
  });
  await drainChecks();
  expect(notify).toHaveBeenCalledTimes(1);
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
  ).toEqual({ assignments: [assignment], userId: "student-a" });
  const history = await deadlineNotificationHistoryStorage.getValue();
  expect(history?.['["student-a",10,101]']?.hour).toBe(true);
});

it("retries only the rejected reminder and serializes overlapping alarm reviews", async ({
  onTestFinished,
}) => {
  vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
  onTestFinished(() => {
    vi.useRealTimers();
  });
  const student = "student-a";
  await userIdStorage.setValue(student);
  vi.spyOn(cachedAssignmentsStorage, "watch").mockReturnValue(() => {});
  const logError = vi.spyOn(console, "error").mockImplementation(() => {});

  const hourDueAt = Date.now() + HOUR_IN_MS;
  const dayDueAt = Date.now() + 12 * HOUR_IN_MS;
  const hourAssignment = createMockActivity({
    due_date: new Date(hourDueAt).toISOString(),
    id: 101,
  });
  const dayAssignment = createMockActivity({
    due_date: new Date(dayDueAt).toISOString(),
    id: 102,
  });
  const hourKey = getAssignmentKey(student, hourAssignment);
  const dayKey = getAssignmentKey(student, dayAssignment);
  const hourId = "assignwatch-ASM-101-101-1h";
  const dayId = "assignwatch-ASM-101-102";
  type NotificationOptions = Parameters<typeof browser.notifications.create>[0];
  const notify = vi
    .spyOn(browser.notifications, "create")
    .mockImplementation((id: string | NotificationOptions) =>
      id === hourId
        ? Promise.reject(new Error("Browser rejected notification"))
        : Promise.resolve()
    );
  background.main();

  expect(
    await sendMessage({
      action: "cacheClassAssignments",
      assignments: [hourAssignment, dayAssignment],
      classId: hourAssignment.class_id,
      classIds: [hourAssignment.class_id],
      userId: student,
    })
  ).toEqual({ ok: true });
  expect(notify).not.toHaveBeenCalled();

  await drainChecks();

  const firstHistory = {
    [dayKey]: { day: true, dueAt: dayDueAt, hour: false },
    [hourKey]: { day: false, dueAt: hourDueAt, hour: false },
  };
  expect(await deadlineNotificationHistoryStorage.getValue()).toEqual(
    firstHistory
  );
  expect(notify.mock.calls.map(([id]) => id)).toEqual([hourId, dayId]);
  expect(logError).toHaveBeenCalledExactlyOnceWith(
    "Failed to create deadline notification"
  );

  const deliveryStarted = Promise.withResolvers<void>();
  const delivery = Promise.withResolvers<void>();
  notify.mockImplementation(() => {
    deliveryStarted.resolve();
    return delivery.promise;
  });
  const retry = drainChecks();
  await deliveryStarted.promise;
  const overlapping = drainChecks();
  try {
    expect(await deadlineNotificationHistoryStorage.getValue()).toEqual(
      firstHistory
    );
    expect(notify.mock.calls.map(([id]) => id)).toEqual([
      hourId,
      dayId,
      hourId,
    ]);
  } finally {
    delivery.resolve();
    await Promise.all([retry, overlapping]);
  }

  expect(await deadlineNotificationHistoryStorage.getValue()).toEqual({
    ...firstHistory,
    [hourKey]: { day: true, dueAt: hourDueAt, hour: true },
  });
  expect(notify.mock.calls.map(([id]) => id)).toEqual([hourId, dayId, hourId]);
});

it("retains the cached records of failed classes and replaces successful classes", async () => {
  background.main();
  const oldA = createMockActivity({ class_id: 10, due_date: null, id: 1 });
  const oldB = createMockActivity({ class_id: 20, due_date: null, id: 2 });
  const freshA = createMockActivity({ class_id: 10, due_date: null, id: 3 });
  await cachedAssignmentsStorage.setValue({
    assignments: [oldA, oldB],
    userId: "student-a",
  });
  await sendMessage({
    action: "cacheClassAssignments",
    assignments: [freshA],
    classId: 10,
    classIds: [10, 20],
    userId: "student-a",
  });
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
      .assignments
  ).toEqual([oldB, freshA]);
  await sendMessage({
    action: "cacheClassAssignments",
    assignments: [],
    classId: 10,
    classIds: [10, 20],
    userId: "student-a",
  });
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
      .assignments
  ).toEqual([oldB]);
});

it("does not mix records belonging to different student accounts", async () => {
  background.main();
  const old = createMockActivity({ class_id: 10, due_date: null });
  const fresh = createMockActivity({ class_id: 20, due_date: null });
  await cachedAssignmentsStorage.setValue({
    assignments: [old],
    userId: "student-a",
  });
  await sendMessage({
    action: "cacheClassAssignments",
    assignments: [fresh],
    classId: 20,
    classIds: [10, 20],
    userId: "student-b",
  });
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [fresh],
    userId: "student-b",
  });
});

it("serializes concurrent successful class updates without losing either result", async () => {
  background.main();
  const a = createMockActivity({ class_id: 10, due_date: null, id: 1 });
  const b = createMockActivity({ class_id: 20, due_date: null, id: 2 });
  await Promise.all([
    sendMessage({
      action: "cacheClassAssignments",
      assignments: [a],
      classId: 10,
      classIds: [10, 20],
      userId: "student-a",
    }),
    sendMessage({
      action: "cacheClassAssignments",
      assignments: [b],
      classId: 20,
      classIds: [10, 20],
      userId: "student-a",
    }),
  ]);
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
      .assignments
  ).toEqual([a, b]);
});

it("drops records for classes no longer enrolled", async () => {
  background.main();
  const retired = createMockActivity({ class_id: 30, due_date: null, id: 1 });
  const current = createMockActivity({ class_id: 10, due_date: null, id: 2 });
  await cachedAssignmentsStorage.setValue({
    assignments: [retired],
    userId: "student-a",
  });
  await sendMessage({
    action: "cacheClassAssignments",
    assignments: [current],
    classId: 10,
    classIds: [10],
    userId: "student-a",
  });
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
      .assignments
  ).toEqual([current]);
});

it("rejects mismatched classes and resolved manual dates at the raw-cache boundary", async () => {
  background.main();
  const raw = createMockActivity({ class_id: 10, due_date: null });
  const message = {
    action: "cacheClassAssignments",
    assignments: [raw],
    classId: 10,
    classIds: [10],
    userId: "student-a",
  };
  expect(
    dispatchMessage(
      { ...message, assignments: [{ ...raw, class_id: 20 }] },
      vi.fn()
    )
  ).toBeUndefined();
  expect(
    dispatchMessage(
      {
        ...message,
        assignments: [{ ...raw, manualDueDate: "2030-01-01T00:00:00Z" }],
      },
      vi.fn()
    )
  ).toBeUndefined();
  expect(
    dispatchMessage({ ...message, classIds: [20] }, vi.fn())
  ).toBeUndefined();
  expect(await cachedAssignmentsStorage.getValue()).toEqual([]);
});

it("localizes desktop notifications in Thai and English based on language preference", async () => {
  background.main();
  const notify = vi.spyOn(browser.notifications, "create").mockResolvedValue();
  const dueSoon = createMockActivity({
    class_id: 10,
    due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    id: 101,
    title: "Test Activity",
  });

  await languageStorage.setValue("th");
  await userIdStorage.setValue("student-a");
  await cachedAssignmentsStorage.setValue({
    assignments: [dueSoon],
    userId: "student-a",
  });
  await drainChecks();

  expect(notify).toHaveBeenCalledTimes(1);
  expect(notify).toHaveBeenCalledWith(
    "assignwatch-ASM-10-101-1h",
    expect.objectContaining({
      buttons: [{ title: "เปิดดูงาน" }],
      message: '"Test Activity" จะครบกำหนดส่งในอีกไม่ถึง 1 ชั่วโมง',
      title: "งานใกล้ถึงกำหนดส่ง",
    })
  );

  notify.mockClear();
  await languageStorage.setValue("en");
  await deadlineNotificationHistoryStorage.setValue(null);
  await drainChecks();

  expect(notify).toHaveBeenCalledTimes(1);
  expect(notify).toHaveBeenCalledWith(
    "assignwatch-ASM-10-101-1h",
    expect.objectContaining({
      buttons: [{ title: "View assignment" }],
      message: '"Test Activity" is due in less than 1 hour.',
      title: "Assignment due soon",
    })
  );
});

it("acknowledges assignment and manual date writes without Safari notifications", async ({
  onTestFinished,
}) => {
  vi.stubEnv("BROWSER", "safari");
  const { notifications } = browser;
  Object.defineProperty(browser, "notifications", { value: undefined });
  onTestFinished(() => {
    Object.defineProperty(browser, "notifications", { value: notifications });
  });
  background.main();
  await userIdStorage.setValue("student-a");
  const assignment = createMockActivity({
    class_id: 10,
    due_date: null,
    id: 101,
  });
  const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  expect(
    await sendMessage({
      action: "cacheClassAssignments",
      assignments: [assignment],
      classId: 10,
      classIds: [10],
      userId: "student-a",
    })
  ).toEqual({ ok: true });
  expect(
    await sendMessage({
      action: "setManualDueDate",
      assignmentId: 101,
      classId: 10,
      dueDate,
      userId: "student-a",
    })
  ).toEqual({ ok: true });

  await drainChecks();
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [assignment],
    userId: "student-a",
  });
  expect(await manualDueDatesStorage.getValue()).toEqual({
    '["student-a",10,101]': dueDate,
  });
  expect(await deadlineNotificationHistoryStorage.getValue()).toBeNull();
});

it("uses Firefox-compatible notification options and opens the assignment on a body click", async () => {
  vi.stubEnv("BROWSER", "firefox");
  const registerButton = vi
    .spyOn(browser.notifications.onButtonClicked, "addListener")
    .mockImplementation(() => {});
  const createNotification = fakeBrowser.notifications.create;
  type NotificationOptions = Parameters<typeof createNotification>[0];
  const notify = vi
    .spyOn(fakeBrowser.notifications, "create")
    .mockImplementation(
      (
        idOrOptions: string | NotificationOptions,
        options?: NotificationOptions
      ) => {
        const payload = typeof idOrOptions === "string" ? options : idOrOptions;
        if (payload && "buttons" in payload) {
          return Promise.reject(
            new TypeError("Firefox notifications do not accept buttons")
          );
        }
        if (typeof idOrOptions !== "string") {
          return createNotification(idOrOptions);
        }
        if (!options) {
          return Promise.reject(
            new TypeError("Notification options are required")
          );
        }
        return createNotification(idOrOptions, options);
      }
    );
  const createTab = vi.spyOn(browser.tabs, "create");
  background.main();
  await userIdStorage.setValue("student-a");
  await cachedAssignmentsStorage.setValue({
    assignments: [
      createMockActivity({
        class_id: 10,
        due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        id: 101,
      }),
    ],
    userId: "student-a",
  });
  await drainChecks();

  const notificationId = "assignwatch-ASM-10-101-1h";
  expect(notify).toHaveBeenCalledExactlyOnceWith(
    notificationId,
    expect.objectContaining({ type: "basic" })
  );
  const notifications = await fakeBrowser.notifications.getAll();
  expect(notifications[notificationId]).not.toHaveProperty("buttons");
  expect(registerButton).not.toHaveBeenCalled();
  await fakeBrowser.notifications.onClicked.trigger(notificationId);
  expect(createTab).toHaveBeenCalledExactlyOnceWith({
    url: "https://app.leb2.org/class/10/activity/101",
  });
});

it("opens the assignment and clears the notification for both Chromium click events", async () => {
  vi.stubEnv("BROWSER", "chrome");
  const createTab = vi.spyOn(browser.tabs, "create");
  const clear = vi.spyOn(browser.notifications, "clear");
  background.main();

  const notificationId = "assignwatch-ASM-10-101-1h";
  const assignmentTab = { url: "https://app.leb2.org/class/10/activity/101" };
  await fakeBrowser.notifications.onClicked.trigger(notificationId);
  expect(createTab).toHaveBeenCalledExactlyOnceWith(assignmentTab);
  expect(clear).toHaveBeenCalledExactlyOnceWith(notificationId);

  createTab.mockClear();
  clear.mockClear();
  await fakeBrowser.notifications.onButtonClicked.trigger(notificationId, 0);
  expect(createTab).toHaveBeenCalledExactlyOnceWith(assignmentTab);
  expect(clear).toHaveBeenCalledExactlyOnceWith(notificationId);
});

it("leaves unrelated Chrome messages unclaimed without a response", async () => {
  vi.stubEnv("BROWSER", "chrome");
  background.main();

  const sendResponse = vi.fn();
  expect(
    dispatchMessage({ action: "unrelated" }, sendResponse)
  ).toBeUndefined();
  await drainChecks();
  expect(sendResponse).not.toHaveBeenCalled();
});
