import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";

import background from "@/entrypoints/background";
import type { CacheClassAssignmentsMessage } from "@/lib/assignment-cache";
import { readAssignmentSnapshot } from "@/lib/manual-due-dates";
import {
  cachedAssignmentsStorage,
  classInfoStorage,
  deadlineNotificationHistoryStorage,
  languageStorage,
  manualDueDatesStorage,
  readEnrollmentScope,
  userIdStorage,
} from "@/lib/storage";
import type { Activity, EnrollmentScope } from "@/types";

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

const classInfo = (id: number) => ({
  description: "",
  id,
  section: "",
  semester: "",
  title: `Class ${id}`,
});

async function publishEnrollment(
  userId: string,
  classIds: number[] | null
): Promise<EnrollmentScope> {
  expect(
    await sendMessage({
      action: "publishEnrollment",
      classes: classIds?.map(classInfo) ?? null,
      userId,
    })
  ).toEqual({ ok: true });
  const scope = readEnrollmentScope(await classInfoStorage.getValue());
  if (!scope) {
    throw new Error("Expected a worker-approved enrollment");
  }
  return scope;
}

function cacheMessage(
  { generation, userId }: EnrollmentScope,
  classId: number,
  assignments: Activity[]
): CacheClassAssignmentsMessage {
  return {
    action: "cacheClassAssignments",
    assignments,
    classId,
    generation,
    userId,
  };
}

beforeEach(() => {
  fakeBrowser.reset();
  messageRegistration = spyOnMessageRegistration();
});
afterEach(async () => {
  await drainChecks();
  vi.useRealTimers();
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
  const scope = await publishEnrollment("student-a", [10, 20]);
  const assignment = createMockActivity({
    class_id: 10,
    due_date: null,
    id: 101,
  });
  expect(await sendMessage(cacheMessage(scope, 10, [assignment]))).toEqual({
    ok: true,
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

it("retains the cached records of failed classes and replaces successful classes", async () => {
  background.main();
  const oldA = createMockActivity({ class_id: 10, due_date: null, id: 1 });
  const oldB = createMockActivity({ class_id: 20, due_date: null, id: 2 });
  const freshA = createMockActivity({ class_id: 10, due_date: null, id: 3 });
  await cachedAssignmentsStorage.setValue({
    assignments: [oldA, oldB],
    userId: "student-a",
  });
  const scope = await publishEnrollment("student-a", [10, 20]);
  await sendMessage(cacheMessage(scope, 10, [freshA]));
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
      .assignments
  ).toEqual([oldB, freshA]);
  await sendMessage(cacheMessage(scope, 10, []));
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
  const scope = await publishEnrollment("student-b", [10, 20]);
  await sendMessage(cacheMessage(scope, 20, [fresh]));
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [fresh],
    userId: "student-b",
  });
});

it("serializes concurrent successful class updates without losing either result", async () => {
  background.main();
  const a = createMockActivity({ class_id: 10, due_date: null, id: 1 });
  const b = createMockActivity({ class_id: 20, due_date: null, id: 2 });
  const scope = await publishEnrollment("student-a", [10, 20]);
  await Promise.all([
    sendMessage(cacheMessage(scope, 10, [a])),
    sendMessage(cacheMessage(scope, 20, [b])),
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
    assignments: [retired, current],
    userId: "student-a",
  });
  await publishEnrollment("student-a", [10, 30]);
  await publishEnrollment("student-a", [10]);
  expect(
    readAssignmentSnapshot(await cachedAssignmentsStorage.getValue())
      .assignments
  ).toEqual([current]);
});

it("keeps a generation for equivalent enrollment and changes it for a new owner", async () => {
  background.main();
  await classInfoStorage.setValue({
    classes: [classInfo(10), classInfo(20)],
    userId: "student-a",
  });
  const initial = await publishEnrollment("student-a", null);
  expect(initial.classes).toEqual([classInfo(10), classInfo(20)]);
  expect(await publishEnrollment("student-a", null)).toEqual(initial);
  const renamed = [{ ...classInfo(20), title: "Renamed" }, classInfo(10)];
  expect(
    await sendMessage({
      action: "publishEnrollment",
      classes: renamed,
      userId: "student-a",
    })
  ).toEqual({ ok: true });
  expect(await classInfoStorage.getValue()).toEqual({
    ...initial,
    classes: renamed,
  });
  const other = await publishEnrollment("student-b", null);
  expect(other.classes).toBeNull();
  expect(other.generation).not.toBe(initial.generation);
  expect(await publishEnrollment("student-b", null)).toEqual(other);
  expect(await publishEnrollment("student-a", null)).toMatchObject({
    classes: null,
    userId: "student-a",
  });
});

it("rejects late A results after B saves its own assignments and reminders", async () => {
  background.main();
  const notify = vi.spyOn(browser.notifications, "create").mockResolvedValue();
  const a = await publishEnrollment("student-a", [10]);
  const response = Promise.withResolvers<Activity[]>();
  const deliverLateResult = async () =>
    sendMessage(cacheMessage(a, 10, await response.promise));
  const late = deliverLateResult();

  const b = await publishEnrollment("student-b", [20]);
  const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const assignment = createMockActivity({ class_id: 20, due_date: dueDate });
  expect(await sendMessage(cacheMessage(b, 20, [assignment]))).toEqual({
    ok: true,
  });
  response.resolve([createMockActivity({ class_id: 10, due_date: dueDate })]);

  expect(await late).toEqual({ discarded: true, ok: false });
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [assignment],
    userId: "student-b",
  });
  await drainChecks();
  expect(notify).toHaveBeenCalledExactlyOnceWith(
    "assignwatch-ASM-20-1-1h",
    expect.anything()
  );
});

it("rejects obsolete A work after A to B to A and a worker restart", async () => {
  background.main();
  const firstA = await publishEnrollment("student-a", [10]);
  await publishEnrollment("student-b", [10]);
  const currentA = await publishEnrollment("student-a", [10]);
  expect(currentA.generation).not.toBe(firstA.generation);

  await drainChecks();
  const persisted = await browser.storage.local.get(null);
  fakeBrowser.reset();
  messageRegistration.mockClear();
  await browser.storage.local.set(persisted);
  vi.resetModules();
  const { default: restartedWorker } = await import("@/entrypoints/background");
  restartedWorker.main();

  expect(await sendMessage(cacheMessage(firstA, 10, []))).toEqual({
    discarded: true,
    ok: false,
  });
  expect(await sendMessage(cacheMessage(currentA, 10, []))).toEqual({
    ok: true,
  });
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [],
    userId: "student-a",
  });
});

it("preserves the new roster and newly cached class when old enrollment finishes last", async () => {
  background.main();
  const old = await publishEnrollment("student-a", [10, 20]);
  const retired = createMockActivity({ class_id: 20, due_date: null });
  await sendMessage(cacheMessage(old, 20, [retired]));

  const current = await publishEnrollment("student-a", [10, 30]);
  expect(current.generation).not.toBe(old.generation);
  const added = createMockActivity({ class_id: 30, due_date: null });
  await sendMessage(cacheMessage(current, 30, [added]));
  expect(await sendMessage(cacheMessage(old, 10, []))).toEqual({
    discarded: true,
    ok: false,
  });
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [added],
    userId: "student-a",
  });

  const empty = await publishEnrollment("student-a", []);
  expect(empty.generation).not.toBe(current.generation);
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [],
    userId: "student-a",
  });
  expect(await sendMessage(cacheMessage(current, 30, [added]))).toEqual({
    discarded: true,
    ok: false,
  });
});

it("filters reminders after a prune failure and repairs the cache before re-adding a class", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  background.main();
  const notify = vi.spyOn(browser.notifications, "create").mockResolvedValue();
  const old = await publishEnrollment("student-a", [10, 20]);
  const retired = createMockActivity({
    class_id: 20,
    due_date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  });
  await sendMessage(cacheMessage(old, 20, [retired]));
  vi.spyOn(cachedAssignmentsStorage, "setValue").mockRejectedValueOnce(
    new Error("Storage temporarily unavailable")
  );
  expect(
    await sendMessage({
      action: "publishEnrollment",
      classes: [classInfo(10)],
      userId: "student-a",
    })
  ).toEqual({ ok: false });
  expect(await classInfoStorage.getValue()).toMatchObject({
    classes: [classInfo(10)],
  });
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [retired],
    userId: "student-a",
  });
  expect(await sendMessage(cacheMessage(old, 10, []))).toEqual({
    discarded: true,
    ok: false,
  });
  // Move the clock into the reminder window of the lingering row.
  vi.setSystemTime(Date.now() - 60 * 60 * 1000);
  await drainChecks();
  expect(notify).not.toHaveBeenCalled();

  await publishEnrollment("student-a", [10, 20]);
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [],
    userId: "student-a",
  });
});

it("keeps the previous roster and rows if publishing the new scope fails", async () => {
  background.main();
  const previous = await publishEnrollment("student-a", [10, 20]);
  const row = createMockActivity({ class_id: 20, due_date: null });
  await sendMessage(cacheMessage(previous, 20, [row]));
  vi.spyOn(classInfoStorage, "setValue").mockRejectedValueOnce(
    new Error("Storage temporarily unavailable")
  );
  expect(
    await sendMessage({
      action: "publishEnrollment",
      classes: [classInfo(10)],
      userId: "student-a",
    })
  ).toEqual({ ok: false });
  expect(await classInfoStorage.getValue()).toEqual(previous);
  expect(await cachedAssignmentsStorage.getValue()).toEqual({
    assignments: [row],
    userId: "student-a",
  });
  expect(await sendMessage(cacheMessage(previous, 10, []))).toEqual({
    ok: true,
  });
});

it("reports a cache storage failure separately from a superseded result", async () => {
  background.main();
  const scope = await publishEnrollment("student-a", [10]);
  vi.spyOn(cachedAssignmentsStorage, "setValue").mockRejectedValueOnce(
    new Error("Storage temporarily unavailable")
  );
  const message = cacheMessage(scope, 10, []);
  expect(await sendMessage(message)).toEqual({ ok: false });
  expect(await sendMessage(message)).toEqual({ ok: true });
});

it("rejects malformed enrollment observations without changing the scope", async () => {
  background.main();
  const scope = await publishEnrollment("student-a", [10]);
  for (const message of [
    { classes: [classInfo(0)], userId: "student-b" },
    { classes: [classInfo(20), classInfo(20)], userId: "student-b" },
    { classes: [{ id: 20 }], userId: "student-b" },
    { classes: [], userId: " " },
    { userId: "student-b" },
  ]) {
    expect(
      dispatchMessage({ action: "publishEnrollment", ...message }, vi.fn())
    ).toBeUndefined();
  }
  expect(await classInfoStorage.getValue()).toEqual(scope);
});

it("rejects mismatched classes and resolved manual dates at the raw-cache boundary", async () => {
  background.main();
  const raw = createMockActivity({ class_id: 10, due_date: null });
  const scope = await publishEnrollment("student-a", [10]);
  const message = cacheMessage(scope, 10, [raw]);
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
    dispatchMessage({ ...message, generation: "" }, vi.fn())
  ).toBeUndefined();
  expect(await sendMessage(cacheMessage(scope, 20, []))).toEqual({
    discarded: true,
    ok: false,
  });
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
  const scope = await publishEnrollment("student-a", [10]);
  const assignment = createMockActivity({
    class_id: 10,
    due_date: null,
    id: 101,
  });
  const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  expect(await sendMessage(cacheMessage(scope, 10, [assignment]))).toEqual({
    ok: true,
  });
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
