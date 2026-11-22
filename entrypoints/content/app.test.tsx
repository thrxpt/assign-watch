// @vitest-environment happy-dom

import type { ComponentProps, ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AssignmentLoadError,
  AssignmentStaleWarning,
} from "@/components/assignment-load-error";
import App from "@/entrypoints/content/app";
import {
  AssignmentRequestError,
  fetchAssignments,
  resetPacingQueue,
} from "@/lib/api";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import {
  cachedAssignmentsStorage,
  classInfoStorage,
  hiddenClassesStorage,
  userIdStorage,
} from "@/lib/storage";
import type { Activity, ClassInfo } from "@/types";

interface QueryResult {
  data: Activity[] | undefined;
  dataUpdatedAt: number;
  error: Error | null;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  refetch: () => Promise<void>;
}

const state = vi.hoisted(() => ({
  classes: [] as ClassInfo[],
  hiddenClasses: [] as number[],
  locale: "en" as Locale,
  queryCache: new Map<
    string,
    {
      data: unknown;
      dataUpdatedAt: number;
      error: unknown;
      fetchStatus: string;
    }
  >(),
  queryConfigs: [] as {
    enabled: unknown;
    queryFn: unknown;
    queryKey: unknown[];
  }[],
  results: [] as QueryResult[],
  retry: null as (() => Promise<void>) | null,
  scrapedUserId: "student-1" as string | null,
  useQueryCache: false,
}));

const queryClient = {
  getQueryState: (queryKey: readonly unknown[]) =>
    state.queryCache.get(JSON.stringify(queryKey)),
  setQueryData: (
    queryKey: readonly unknown[],
    data: unknown,
    options?: { updatedAt?: number }
  ) => {
    state.queryCache.set(JSON.stringify(queryKey), {
      data,
      dataUpdatedAt: options?.updatedAt ?? Date.now(),
      error: null,
      fetchStatus: "idle",
    });
    return data;
  },
};
let mountedRoot: Root | null = null;

vi.mock("@/components/assignment-load-error", async (importOriginal) => {
  const actual = await importOriginal<{
    AssignmentLoadError: typeof AssignmentLoadError;
    AssignmentStaleWarning: typeof AssignmentStaleWarning;
  }>();
  return {
    AssignmentLoadError: (
      props: ComponentProps<typeof actual.AssignmentLoadError>
    ) => {
      state.retry = props.onRetry;
      return <actual.AssignmentLoadError {...props} />;
    },
    AssignmentStaleWarning: actual.AssignmentStaleWarning,
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueries: ({
    combine,
    queries,
  }: {
    combine: (results: QueryResult[]) => unknown;
    queries: {
      enabled: unknown;
      queryFn: unknown;
      queryKey: readonly unknown[];
    }[];
  }) => {
    state.queryConfigs = queries.map((query) => ({
      enabled: query.enabled,
      queryFn: query.queryFn,
      queryKey: [...query.queryKey],
    }));
    const results = state.useQueryCache
      ? queries.map((query) => {
          const cached = state.queryCache.get(JSON.stringify(query.queryKey));
          return {
            data: cached?.data as Activity[] | undefined,
            dataUpdatedAt: cached?.dataUpdatedAt ?? 0,
            error: (cached?.error as Error | null) ?? null,
            isError: Boolean(cached?.error),
            isFetching: cached?.fetchStatus === "fetching",
            isPending:
              cached?.data === undefined &&
              (cached?.error === null || cached?.error === undefined),
            refetch: vi.fn(async () => {}),
          };
        })
      : state.results;
    return combine(results);
  },
  useQueryClient: () => queryClient,
}));

vi.mock("@/lib/dom", () => ({
  scrapeClassCards: () => [],
  scrapeUserId: () => state.scrapedUserId,
}));
vi.mock("@/lib/use-storage-state", () => ({
  useStorageState: (item: { fallback: unknown }) => {
    if (item === classInfoStorage) {
      return [state.classes, vi.fn()];
    }
    if (item === hiddenClassesStorage) {
      return [state.hiddenClasses, vi.fn()];
    }
    return [item.fallback, vi.fn()];
  },
}));
vi.mock("@/lib/use-i18n", () => ({
  useI18n: () => ({
    t: (key: string, substitutions?: Record<string, string | number>) =>
      translate(key, state.locale, substitutions),
  }),
}));

function Slot({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

// Render the dialog and both views without browser-only overlay machinery.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: Slot,
  DialogContent: Slot,
  DialogFooter: Slot,
  DialogHeader: Slot,
  DialogTitle: Slot,
}));
vi.mock("@/components/ui/tabs", () => ({
  Tabs: Slot,
  TabsContent: Slot,
  TabsList: Slot,
  TabsTrigger: Slot,
}));
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/assignment-filters", () => ({
  AssignmentFilters: () => null,
}));
vi.mock("@/components/assignment-sort", () => ({ AssignmentSort: () => null }));
vi.mock("@/components/assignment-group", () => ({
  AssignmentGroup: () => null,
}));
vi.mock("@/components/hidden-items-manager", () => ({
  HiddenItemsManager: () => null,
}));
vi.mock("@/components/dialog-tips", () => ({
  DialogTips: () => <span>Dialog tips</span>,
}));
vi.mock("@/components/class", () => ({
  Class: ({ assignments }: { assignments: Activity[] }) => (
    <div>
      {assignments.map((item) => (
        <span key={item.id}>{item.title}</span>
      ))}
    </div>
  ),
}));
vi.mock("@/components/calendar-view", () => ({
  CalendarView: ({
    assignments,
  }: {
    assignments: { assignment: Activity }[];
  }) => (
    <div>
      {assignments.map(({ assignment }) => (
        <span key={assignment.id}>{assignment.title}</span>
      ))}
    </div>
  ),
}));

function result(overrides: Partial<QueryResult> = {}): QueryResult {
  return {
    data: undefined,
    dataUpdatedAt: 1,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: vi.fn(async () => {}),
    ...overrides,
  };
}

function mountApp() {
  const navigation = document.createElement("div");
  navigation.className = "nav navbar-nav page-menu flex-container fxf-rnw";
  const container = document.createElement("div");
  document.body.append(navigation, container);
  mountedRoot = createRoot(container);
  act(() => mountedRoot?.render(<App />));
  return { container, navigation };
}

async function requestError(status = 429): Promise<Error> {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(null, { status, statusText: "Request failed" })
  );
  try {
    await fetchAssignments([1], "student-1");
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
  }
  throw new Error("Expected the HTTP request to fail");
}

describe("assignment dialog load failures", () => {
  beforeEach(() => {
    resetPacingQueue();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    document.body.replaceChildren();
    document.body.dataset.userid = "student-1";
    state.classes = [
      {
        description: "",
        id: 1,
        section: "1",
        semester: "1/2026",
        title: "Class 1",
      },
    ];
    state.hiddenClasses = [];
    state.locale = "en";
    state.results = [];
    state.retry = null;
    state.queryCache.clear();
    state.queryConfigs = [];
    state.scrapedUserId = "student-1";
    state.useQueryCache = false;
  });

  afterEach(() => {
    if (mountedRoot) {
      act(() => mountedRoot?.unmount());
      mountedRoot = null;
    }
    document.body.replaceChildren();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows rate limiting instead of claiming there are no assignments", async () => {
    state.results = [result({ error: await requestError(), isError: true })];
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Some assignments may not have loaded.");
    expect(html).toContain("Try again");
    expect(html).not.toContain("All caught up!");
  });

  it("shows the Retry-After countdown and disables retry until it expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T00:00:00Z"));
    state.results = [
      result({
        error: new AssignmentRequestError(
          429,
          "Too Many Requests",
          Date.now() + 120_000
        ),
        isError: true,
      }),
    ];

    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Try again in 120s");
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*>Try again in 120s<\/button>/u
    );
  });

  it("ticks down and uses the current time when a new 429 deadline arrives", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T00:00:00Z"));
    state.results = [
      result({
        error: new AssignmentRequestError(
          429,
          "Too Many Requests",
          Date.now() + 120_000
        ),
        isError: true,
      }),
    ];
    vi.spyOn(userIdStorage, "setValue").mockResolvedValue();
    const { container } = mountApp();

    expect(container.textContent).toContain("Try again in 120s");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(container.textContent).toContain("Try again in 119s");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    state.results = [
      result({
        error: new AssignmentRequestError(
          429,
          "Too Many Requests",
          Date.now() + 120_000
        ),
        isError: true,
      }),
    ];
    act(() => mountedRoot?.render(<App />));
    expect(container.textContent).toContain("Try again in 120s");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(container.textContent).toContain("Try again in 120s");
  });

  it("allows retry after the Retry-After deadline passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T00:00:00Z"));
    state.results = [
      result({
        error: new AssignmentRequestError(
          429,
          "Too Many Requests",
          Date.now() - 1
        ),
        isError: true,
      }),
    ];

    const html = renderToStaticMarkup(<App />);

    expect(html).toMatch(/<button[^>]*>Try again<\/button>/u);
    expect(html).not.toMatch(
      /<button[^>]*disabled=""[^>]*>Try again<\/button>/u
    );
  });

  it("shows the stale-data warning while restored assignments refresh", () => {
    const assignment = {
      activity_submission_id: 0,
      class_id: 1,
      due_date: "2099-12-31T12:00:00Z",
      due_date_exceed: false,
      group_type: "IND",
      id: 101,
      start_date: "2026-09-01T00:00:00Z",
      title: "Restored homework",
      type: "ASM",
    } as Activity;
    state.results = [
      result({ data: [assignment], dataUpdatedAt: 0, isFetching: true }),
    ];

    const { container } = mountApp();
    const staleWarning = container.querySelector("output");

    expect(staleWarning?.textContent).toContain("may be outdated");
    expect(staleWarning?.querySelector("p")).toBeNull();
    expect(staleWarning?.querySelector("span")?.textContent).toContain(
      "may be outdated"
    );
    expect(container.textContent).not.toContain("Dialog tips");
    expect(container.textContent).not.toContain("Unable to load assignments");
  });

  it("clears the stale-data warning after a successful class refresh", () => {
    const assignment = {
      activity_submission_id: 0,
      class_id: 1,
      due_date: "2099-12-31T12:00:00Z",
      due_date_exceed: false,
      group_type: "IND",
      id: 101,
      start_date: "2026-09-01T00:00:00Z",
      title: "Restored homework",
      type: "ASM",
    } as Activity;
    state.results = [
      result({ data: [assignment], dataUpdatedAt: 0, isFetching: true }),
    ];
    vi.spyOn(userIdStorage, "setValue").mockResolvedValue();
    const { container } = mountApp();

    expect(container.querySelector("output")?.textContent).toContain(
      "may be outdated"
    );

    state.results = [result({ data: [assignment], dataUpdatedAt: Date.now() })];
    act(() => mountedRoot?.render(<App />));

    expect(container.querySelector("output")).toBeNull();
    expect(container.textContent).toContain("Dialog tips");
  });

  it("waits for the snapshot read before enabling queries and shows restored rows", async () => {
    state.useQueryCache = true;
    const assignment = {
      activity_submission_id: 0,
      class_id: 1,
      due_date: "2099-12-31T12:00:00Z",
      due_date_exceed: false,
      group_type: "IND",
      id: 101,
      start_date: "2026-09-01T00:00:00Z",
      title: "Restored homework",
      type: "ASM",
    } as Activity;
    const { promise: snapshotPromise, resolve } =
      Promise.withResolvers<
        Awaited<ReturnType<typeof cachedAssignmentsStorage.getValue>>
      >();
    vi.spyOn(cachedAssignmentsStorage, "getValue").mockReturnValue(
      snapshotPromise
    );
    vi.spyOn(userIdStorage, "setValue").mockResolvedValue();

    const { container, navigation } = mountApp();

    const openButton = navigation.querySelector<HTMLButtonElement>(
      "button.nav-link.header-link"
    );
    expect(openButton).not.toBeNull();
    act(() => openButton?.click());

    const isEnabledBeforeRead = state.queryConfigs[0]?.enabled as (query: {
      state: { error: unknown };
    }) => boolean;
    expect(isEnabledBeforeRead({ state: { error: null } })).toBe(false);
    expect(state.queryCache.size).toBe(0);

    await act(async () => {
      resolve({ assignments: [assignment], userId: "student-1" });
      await snapshotPromise;
    });

    const isEnabledAfterRead = state.queryConfigs[0]?.enabled as (query: {
      state: { error: unknown };
    }) => boolean;
    expect(isEnabledAfterRead({ state: { error: null } })).toBe(true);
    expect(container.textContent).toContain(assignment.title);
    expect(container.textContent).toContain("may be outdated");
    expect(container.textContent).not.toContain("Dialog tips");
  });

  it("resumes hydration when the DOM again identifies the captured student", async () => {
    state.useQueryCache = true;
    const { promise: snapshotPromise, resolve } =
      Promise.withResolvers<
        Awaited<ReturnType<typeof cachedAssignmentsStorage.getValue>>
      >();
    vi.spyOn(cachedAssignmentsStorage, "getValue").mockReturnValue(
      snapshotPromise
    );
    vi.spyOn(userIdStorage, "setValue").mockResolvedValue();

    const { container, navigation } = mountApp();
    const openButton = navigation.querySelector<HTMLButtonElement>(
      "button.nav-link.header-link"
    );
    act(() => openButton?.click());

    state.scrapedUserId = null;
    await act(async () => {
      delete document.body.dataset.userid;
      await Promise.resolve();
    });
    await act(async () => {
      resolve({
        assignments: [
          {
            ...({
              activity_submission_id: 0,
              due_date: "2099-12-31T12:00:00Z",
              due_date_exceed: false,
              group_type: "IND",
              start_date: "2026-09-01T00:00:00Z",
              type: "ASM",
            } as Activity),
            class_id: 1,
            id: 101,
            title: "Other student's assignment",
          },
        ],
        userId: "student-1",
      });
      await snapshotPromise;
    });

    expect(state.queryCache.size).toBe(0);
    expect(container.textContent).not.toContain("Other student's assignment");
    const isEnabledAfterRead = state.queryConfigs[0]?.enabled as (query: {
      state: { error: unknown };
    }) => boolean;
    expect(isEnabledAfterRead({ state: { error: null } })).toBe(false);

    await act(async () => {
      state.scrapedUserId = "student-1";
      document.body.dataset.userid = "student-1";
      await Promise.resolve();
    });

    const isEnabledAfterIdentityReturns = state.queryConfigs[0]
      ?.enabled as (query: { state: { error: unknown } }) => boolean;
    expect(isEnabledAfterIdentityReturns({ state: { error: null } })).toBe(
      true
    );
    expect(container.textContent).toContain("Other student's assignment");
  });

  it("switches hydration to the current student after an account change", async () => {
    state.useQueryCache = true;
    const { promise: snapshotPromise, resolve } =
      Promise.withResolvers<
        Awaited<ReturnType<typeof cachedAssignmentsStorage.getValue>>
      >();
    vi.spyOn(cachedAssignmentsStorage, "getValue").mockReturnValue(
      snapshotPromise
    );
    vi.spyOn(userIdStorage, "setValue").mockResolvedValue();

    const { container, navigation } = mountApp();
    const openButton = navigation.querySelector<HTMLButtonElement>(
      "button.nav-link.header-link"
    );
    act(() => openButton?.click());

    await act(async () => {
      state.scrapedUserId = "student-2";
      document.body.dataset.userid = "student-2";
      await Promise.resolve();
    });
    await act(async () => {
      resolve({
        assignments: [
          {
            ...({} as Activity),
            class_id: 1,
            id: 101,
            title: "Student one's assignment",
          },
        ],
        userId: "student-1",
      });
      await snapshotPromise;
    });

    expect(state.queryConfigs[0]?.queryKey).toEqual([
      "assignments",
      1,
      "student-2",
    ]);
    expect(container.textContent).not.toContain("Student one's assignment");
    const isEnabledForCurrentStudent = state.queryConfigs[0]
      ?.enabled as (query: { state: { error: unknown } }) => boolean;
    expect(isEnabledForCurrentStudent({ state: { error: null } })).toBe(true);
  });

  it("keeps previously loaded assignments in both views with a stale-data warning", async () => {
    const assignment = {
      activity_submission_id: 0,
      class_id: 1,
      due_date: "2099-12-31T12:00:00Z",
      due_date_exceed: false,
      group_type: "IND",
      id: 101,
      start_date: "2026-09-01T00:00:00Z",
      title: "Previously loaded homework",
      type: "ASM",
    } as Activity;
    state.results = [
      result({
        data: [assignment],
        error: await requestError(),
        isError: true,
      }),
    ];
    const html = renderToStaticMarkup(<App />);
    expect(html.split(assignment.title)).toHaveLength(3);
    expect(html).toContain("may be outdated");
    expect(html).not.toContain("All caught up!");
  });

  it("does not show failures from hidden classes", async () => {
    state.hiddenClasses = [1];
    state.results = [result({ error: await requestError(), isError: true })];
    const html = renderToStaticMarkup(<App />);
    expect(html).not.toContain("Some assignments may not have loaded.");
    expect(html).toContain("All caught up!");
  });

  it("keeps the genuine successful empty state", () => {
    state.results = [result({ data: [] })];
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("All caught up!");
    expect(html).toContain("Dialog tips");
  });

  it("distinguishes other failures from rate limiting", async () => {
    state.results = [result({ error: await requestError(500), isError: true })];
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Unable to load assignments");
    expect(html).not.toContain("Some assignments may not have loaded.");
    expect(html).not.toContain("All caught up!");
  });

  it("localizes rate limiting in Thai", async () => {
    state.locale = "th";
    state.results = [result({ error: await requestError(), isError: true })];
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("งานบางรายการอาจโหลดไม่สำเร็จ");
    expect(html).toContain("ลองอีกครั้ง");
  });

  it("retries only failed visible classes, leaving successful and hidden classes alone", async () => {
    state.classes.push(
      { ...state.classes[0], id: 2 },
      { ...state.classes[0], id: 3 }
    );
    state.hiddenClasses = [3];
    const failed = result({ error: await requestError(), isError: true });
    const successful = result({ data: [] });
    const hidden = result({ error: failed.error, isError: true });
    state.results = [failed, successful, hidden];
    renderToStaticMarkup(<App />);
    expect(state.retry).not.toBeNull();
    await state.retry?.();
    expect(failed.refetch).toHaveBeenCalledOnce();
    expect(successful.refetch).not.toHaveBeenCalled();
    expect(hidden.refetch).not.toHaveBeenCalled();
  });

  it("retries a rate-limited batch once for every enrolled class", async () => {
    state.classes.push({ ...state.classes[0], id: 2 });
    state.hiddenClasses = [2];
    vi.spyOn(userIdStorage, "setValue").mockResolvedValue();
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    const { container } = mountApp();
    const initialQuery = state.queryConfigs[0]?.queryFn as
      | (() => Promise<unknown>)
      | undefined;
    let batchError: unknown;

    await act(async () => {
      try {
        await initialQuery?.();
      } catch (error) {
        batchError = error;
      }
    });

    expect(batchError).toBeInstanceOf(AssignmentRequestError);
    const refetch = (index: number) =>
      vi.fn(async () => {
        const query = state.queryConfigs[index]?.queryFn as
          | (() => Promise<unknown>)
          | undefined;
        try {
          await query?.();
        } catch {
          // React Query resolves refetch with its result, even when the query fails.
        }
      });
    const visibleRefetch = refetch(0);
    const hiddenRefetch = refetch(1);
    state.results = [
      result({
        error: batchError as Error,
        isError: true,
        refetch: visibleRefetch,
      }),
      result({
        error: batchError as Error,
        isError: true,
        refetch: hiddenRefetch,
      }),
    ];
    act(() => mountedRoot?.render(<App />));

    expect(container.textContent).toContain("Try again");
    await act(async () => {
      await state.retry?.();
    });

    expect(visibleRefetch).toHaveBeenCalledOnce();
    expect(hiddenRefetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      fetch.mock.calls.map(([input]) =>
        new URL(String(input)).searchParams.getAll(
          "filter_groups[0][filters][0][value][]"
        )
      )
    ).toEqual([
      ["1", "2"],
      ["1", "2"],
    ]);
  });

  it("disables retry while a failed refresh is in flight", async () => {
    const failed = result({
      error: await requestError(),
      isError: true,
      isFetching: true,
    });
    state.results = [failed];
    const html = renderToStaticMarkup(<App />);
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*>Trying again…<\/button>/u
    );
    await state.retry?.();
    expect(failed.refetch).not.toHaveBeenCalled();
  });
});
