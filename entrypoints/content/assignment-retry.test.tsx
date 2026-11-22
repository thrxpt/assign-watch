// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { MotionPreferencesProvider } from "@/components/motion-preferences";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "@/entrypoints/content/app";
import { REQUEST_PACING_MS, resetPacingQueue } from "@/lib/api";
import { assignmentQueryKey } from "@/lib/assignment-query-cache";
import {
  classInfoStorage,
  hiddenClassesStorage,
  languageStorage,
} from "@/lib/storage";
import { I18nProvider } from "@/lib/use-i18n";

const STUDENT_ID = "student-1";
const CLASS_IDS = [101, 202, 303];
const NOW = Date.parse("2026-11-17T00:00:00Z");
const QUERY_STALE_TIME_MS = 5 * 60 * 1000;
const ROSTER = CLASS_IDS.map((id) => ({
  description: "",
  id,
  section: "1",
  semester: "1/2026",
  title: `Class ${id}`,
}));
let mounted: { client: QueryClient; root: Root } | null = null;

function classIdRequests() {
  return vi
    .mocked(fetch)
    .mock.calls.map(([input]) =>
      new URL(String(input)).searchParams
        .getAll("filter_groups[0][filters][0][value][]")
        .map(Number)
    );
}

function retryButton(label = "Try again") {
  return [...document.querySelectorAll("[role=dialog] button")].find(
    (button): button is HTMLButtonElement =>
      button instanceof HTMLButtonElement && button.textContent === label
  );
}

async function advanceTime(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function toggleDialog() {
  await act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { altKey: true, code: "KeyA", key: "a" })
    );
  });
}

async function mountApp() {
  const container = document.createElement("div");
  document.body.append(container);
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        staleTime: QUERY_STALE_TIME_MS,
      },
    },
  });
  const root = createRoot(container);
  mounted = { client, root };
  await act(() => {
    root.render(
      <QueryClientProvider client={client}>
        <MotionPreferencesProvider>
          <TooltipProvider>
            <I18nProvider>
              <App />
            </I18nProvider>
          </TooltipProvider>
        </MotionPreferencesProvider>
      </QueryClientProvider>
    );
  });
  await toggleDialog();
}

function noAssignments() {
  return Response.json({ activities: [], user: [] });
}

beforeEach(async () => {
  fakeBrowser.reset();
  resetPacingQueue();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  document.body.dataset.userid = STUDENT_ID;
  browser.runtime.onMessage.addListener(() => Promise.resolve({ ok: true }));
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("Unexpected assignment request")
  );
  await classInfoStorage.setValue({
    classes: ROSTER,
    generation: "initial",
    userId: STUDENT_ID,
  });
  await languageStorage.setValue("en");
});

afterEach(() => {
  if (mounted) {
    act(() => mounted?.root.unmount());
    mounted.client.clear();
    mounted = null;
  }
  document.body.replaceChildren();
  delete document.body.dataset.userid;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("retries a rate-limited class directly after reopening and waiting for its HTTP-date", async () => {
  const fallback = Promise.withResolvers<Response>();
  const retry = Promise.withResolvers<Response>();
  const retryAt = NOW + 2 * QUERY_STALE_TIME_MS;
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(null, { status: 500 }))
    .mockReturnValueOnce(fallback.promise)
    .mockResolvedValueOnce(noAssignments())
    .mockResolvedValueOnce(noAssignments())
    .mockResolvedValueOnce(noAssignments())
    .mockReturnValueOnce(retry.promise)
    .mockResolvedValueOnce(noAssignments());

  await mountApp();
  await advanceTime(3 * REQUEST_PACING_MS);
  const initialRequests = [CLASS_IDS, [101], [202], [303]];
  expect(classIdRequests()).toEqual(initialRequests);
  fallback.resolve(
    new Response(null, {
      headers: { "Retry-After": new Date(retryAt).toUTCString() },
      status: 429,
    })
  );
  await advanceTime(1);

  await toggleDialog();
  expect(document.querySelector("[role=dialog][data-open]")).toBeNull();
  await act(async () => {
    await hiddenClassesStorage.setValue([101]);
  });
  await advanceTime(QUERY_STALE_TIME_MS + 1);
  await toggleDialog();
  await advanceTime(1);
  const refreshedRequests = [...initialRequests, [202, 303]];
  expect(classIdRequests()).toEqual(refreshedRequests);
  await act(async () => {
    await hiddenClassesStorage.setValue([]);
  });
  await advanceTime(retryAt - Date.now() - 1);
  expect(retryButton("Try again in 1s")?.disabled).toBe(true);
  expect(classIdRequests()).toEqual(refreshedRequests);

  await advanceTime(1);
  const action = retryButton();
  expect(action?.disabled).toBe(false);
  await act(() => {
    action?.click();
    action?.click();
  });
  await advanceTime(1);
  expect(classIdRequests()).toEqual([...refreshedRequests, [101]]);
  expect(retryButton("Trying again…")?.disabled).toBe(true);

  await toggleDialog();
  await advanceTime(4 * REQUEST_PACING_MS);
  await toggleDialog();
  await advanceTime(1);
  const requestsDuringRetry = [...refreshedRequests, [101], [202, 303]];
  expect(classIdRequests()).toEqual(requestsDuringRetry);
  expect(retryButton("Trying again…")?.disabled).toBe(true);

  retry.resolve(noAssignments());
  await advanceTime(1);
  expect(retryButton("Trying again…")).toBeUndefined();
  expect(classIdRequests()).toEqual(requestsDuringRetry);
});

it("retries a shared rate limit with one batch for the current roster", async () => {
  const newClassIds = [404, 505, 606];
  await hiddenClassesStorage.setValue([606]);
  const retry = Promise.withResolvers<Response>();
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      new Response(null, { headers: { "Retry-After": "1" }, status: 429 })
    )
    .mockReturnValueOnce(retry.promise);

  await mountApp();
  await advanceTime(REQUEST_PACING_MS);
  expect(classIdRequests()).toEqual([CLASS_IDS]);
  await toggleDialog();
  await act(async () => {
    mounted?.client.setQueryData(assignmentQueryKey(404, STUDENT_ID), [], {
      updatedAt: NOW - QUERY_STALE_TIME_MS + 500,
    });
    await classInfoStorage.setValue({
      classes: ROSTER.map((classInfo, index) => ({
        ...classInfo,
        id: newClassIds[index],
      })),
      generation: "next",
      userId: STUDENT_ID,
    });
  });
  await toggleDialog();
  await advanceTime(1);
  expect(classIdRequests()).toEqual([CLASS_IDS]);
  expect(retryButton("Try again in 1s")?.disabled).toBe(true);

  await advanceTime(NOW + 1000 - Date.now());
  await toggleDialog();
  await toggleDialog();
  await advanceTime(1);
  expect(classIdRequests()).toEqual([CLASS_IDS]);
  expect(retryButton()?.disabled).toBe(false);

  await act(() => retryButton()?.click());
  await advanceTime(REQUEST_PACING_MS);
  expect(classIdRequests()).toEqual([CLASS_IDS, newClassIds]);
  await toggleDialog();
  await toggleDialog();
  await advanceTime(REQUEST_PACING_MS);
  expect(classIdRequests()).toEqual([CLASS_IDS, newClassIds]);
  expect(retryButton("Trying again…")?.disabled).toBe(true);

  retry.resolve(noAssignments());
  await advanceTime(1);
  expect(retryButton("Trying again…")).toBeUndefined();
  expect(classIdRequests()).toEqual([CLASS_IDS, newClassIds]);
});

it.each([101, 202])(
  "keeps retry disabled and cached rows visible when class %i settles first",
  async (firstToSettle) => {
    await browser.storage.local.set({
      cachedAssignments: {
        assignments: [
          {
            class_id: 101,
            due_date: "2026-12-01T00:00:00Z",
            group_type: "IND",
            id: 1,
            start_date: "2026-11-01T00:00:00Z",
            title: "Previously loaded homework",
            type: "ASM",
          },
        ],
        userId: STUDENT_ID,
      },
    });
    const failedRetry = Promise.withResolvers<Response>();
    const successfulRetry = Promise.withResolvers<Response>();
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(noAssignments())
      .mockReturnValueOnce(failedRetry.promise)
      .mockReturnValueOnce(successfulRetry.promise);

    await mountApp();
    await advanceTime(3 * REQUEST_PACING_MS);
    expect(classIdRequests()).toEqual([CLASS_IDS, [101], [202], [303]]);
    expect(document.body.textContent).toContain("Previously loaded homework");
    expect(document.body.textContent).toContain("may be outdated");
    expect(retryButton()?.disabled).toBe(false);

    await act(() => retryButton()?.click());
    await advanceTime(2 * REQUEST_PACING_MS);
    const requests = [CLASS_IDS, [101], [202], [303], [101], [202]];
    expect(classIdRequests()).toEqual(requests);
    expect(retryButton("Trying again…")?.disabled).toBe(true);

    const settle = {
      101: () => failedRetry.resolve(new Response(null, { status: 429 })),
      202: () => successfulRetry.resolve(noAssignments()),
    };
    const settleInOrder =
      firstToSettle === 101
        ? [settle[101], settle[202]]
        : [settle[202], settle[101]];
    settleInOrder[0]();
    await advanceTime(1);
    expect(retryButton("Trying again…")?.disabled).toBe(true);
    expect(document.body.textContent).toContain("Previously loaded homework");

    settleInOrder[1]();
    await advanceTime(1);
    expect(retryButton()?.disabled).toBe(false);
    expect(document.body.textContent).toContain("Previously loaded homework");
    expect(document.body.textContent).toContain("may be outdated");
    expect(classIdRequests()).toEqual(requests);
  }
);
