// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UseQueryOptions, useQueries } from "@tanstack/react-query";
import type { ComponentProps, ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";

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
import {
  isCacheClassAssignmentsMessage,
  SupersededAssignmentRequestError,
} from "@/lib/assignment-cache";
import { assignmentQueryKey } from "@/lib/assignment-query-cache";
import type * as Dom from "@/lib/dom";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import {
  cachedAssignmentsStorage,
  classInfoStorage,
  hiddenClassesStorage,
} from "@/lib/storage";
import type {
  Activity,
  ClassInfo,
  EnrollmentScope,
  StoredClassRoster,
} from "@/types";

interface QueryResult {
  data: Activity[] | undefined;
  dataUpdatedAt: number;
  error: Error | null;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  refetch: () => Promise<unknown>;
}

const state = vi.hoisted(() => ({
  hiddenClasses: [] as number[],
  hiddenItemsClasses: [] as ClassInfo[],
  locale: "en" as Locale,
  onScrape: null as (() => void) | null,
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
  storedClasses: [] as StoredClassRoster,
  useQueryCache: false,
}));

const queryClient = {
  cancelQueries: async () => {},
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
let integrationQueryClient: QueryClient | null = null;

const spyOnRuntimeMessages = (
  runtime: {
    sendMessage: (message: unknown) => Promise<unknown>;
  } = browser.runtime
) => vi.spyOn(runtime, "sendMessage");

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

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<{ useQueries: typeof useQueries }>();
  interface QueryOptions {
    combine: (results: QueryResult[]) => unknown;
    queries: UseQueryOptions<Activity[]>[];
  }
  const useSimulatedQueries = ({ combine, queries }: QueryOptions) => {
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
  };
  return {
    ...actual,
    useQueries: (options: QueryOptions) => {
      const useQueries = integrationQueryClient
        ? actual.useQueries
        : useSimulatedQueries;
      return useQueries(options);
    },
    useQueryClient: () => integrationQueryClient ?? queryClient,
  };
});

vi.mock("@/lib/dom", async (importOriginal) => {
  const actual = await importOriginal<typeof Dom>();
  return {
    ...actual,
    scrapeClassCards: () => {
      state.onScrape?.();
      return actual.scrapeClassCards();
    },
  };
});
vi.mock("@/lib/use-storage-state", () => ({
  useStorageState: (item: { fallback: unknown }) => {
    if (item === classInfoStorage) {
      return [state.storedClasses, vi.fn()];
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
  HiddenItemsManager: ({ allClassInfo }: { allClassInfo: ClassInfo[] }) => {
    state.hiddenItemsClasses = allClassInfo;
    return null;
  },
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

function classInfo(id: number): ClassInfo {
  return {
    description: "",
    id,
    section: "1",
    semester: "1/2026",
    title: `Class ${id}`,
  };
}

function approvedRoster(
  userId = "student-1",
  ids = [1],
  generation = "initial"
): EnrollmentScope {
  return { classes: ids.map(classInfo), generation, userId };
}

function addClasses(...ids: number[]) {
  if (Array.isArray(state.storedClasses) || !state.storedClasses.classes) {
    throw new TypeError("Expected an owned roster");
  }
  state.storedClasses.classes.push(...ids.map(classInfo));
}

function setPageUrl(pathname: string) {
  const { happyDOM } = window as unknown as {
    happyDOM: { setURL: (url: string) => void };
  };
  happyDOM.setURL(`https://app.leb2.org${pathname}`);
}

async function openDialog(navigation: HTMLElement) {
  const openButton = navigation.querySelector<HTMLButtonElement>(
    "button.nav-link.header-link"
  );
  await act(async () => {
    openButton?.click();
    // Let the snapshot read settle so hydration finishes inside act.
    await cachedAssignmentsStorage.getValue();
  });
}

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

function renderApp() {
  mountedRoot?.render(
    integrationQueryClient ? (
      <QueryClientProvider client={integrationQueryClient}>
        <App />
      </QueryClientProvider>
    ) : (
      <App />
    )
  );
}

function mountApp() {
  const navigation = document.createElement("div");
  navigation.className = "nav navbar-nav page-menu flex-container fxf-rnw";
  const container = document.createElement("div");
  document.body.append(navigation, container);
  mountedRoot = createRoot(container);
  act(renderApp);
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
    state.storedClasses = approvedRoster();
    state.hiddenClasses = [];
    state.hiddenItemsClasses = [];
    state.onScrape = null;
    state.locale = "en";
    state.results = [];
    state.retry = null;
    state.queryCache.clear();
    state.queryConfigs = [];
    state.useQueryCache = false;
    setPageUrl("/");
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

    const { container, navigation } = mountApp();
    const openButton = navigation.querySelector<HTMLButtonElement>(
      "button.nav-link.header-link"
    );
    act(() => openButton?.click());

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
    // With no identifiable student the roster is unknown, so nothing is queried.
    expect(state.queryConfigs).toEqual([]);

    await act(async () => {
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

    const { container, navigation } = mountApp();
    const openButton = navigation.querySelector<HTMLButtonElement>(
      "button.nav-link.header-link"
    );
    act(() => openButton?.click());

    await act(async () => {
      state.storedClasses = approvedRoster("student-2");
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
    addClasses(2, 3);
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
    addClasses(2);
    state.hiddenClasses = [2];
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    const { container } = mountApp();
    const initialQuery = state.queryConfigs[0]?.queryFn as
      | ((context: { signal: AbortSignal }) => Promise<unknown>)
      | undefined;
    let batchError: unknown;

    await act(async () => {
      try {
        await initialQuery?.({ signal: new AbortController().signal });
      } catch (error) {
        batchError = error;
      }
    });

    expect(batchError).toBeInstanceOf(AssignmentRequestError);
    const refetch = (index: number) =>
      vi.fn(async () => {
        const query = state.queryConfigs[index]?.queryFn as
          | ((context: { signal: AbortSignal }) => Promise<unknown>)
          | undefined;
        try {
          await query?.({ signal: new AbortController().signal });
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

function queryClassIds() {
  return state.queryConfigs.map(({ queryKey }) => queryKey[1]);
}

function occurrences(text: string | null, search: string) {
  return (text ?? "").split(search).length - 1;
}

describe("class roster ownership", () => {
  beforeEach(() => {
    resetPacingQueue();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    document.body.replaceChildren();
    document.body.dataset.userid = "student-1";
    state.hiddenClasses = [];
    state.hiddenItemsClasses = [];
    state.locale = "en";
    state.onScrape = null;
    state.queryCache.clear();
    state.queryConfigs = [];
    state.results = [];
    state.storedClasses = approvedRoster();
    state.useQueryCache = false;
    setPageUrl("/");
    vi.spyOn(cachedAssignmentsStorage, "getValue").mockResolvedValue([]);
  });

  afterEach(() => {
    if (mountedRoot) {
      act(() => mountedRoot?.unmount());
      mountedRoot = null;
    }
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ["a legacy roster with no owner", [classInfo(1)]],
    [
      "an owned roster without a worker generation",
      { classes: [classInfo(1)], userId: "student-1" },
    ],
    ["a roster owned by another student", approvedRoster("student-2")],
  ] satisfies [string, StoredClassRoster][])(
    "requests nothing and prompts a sync for %s away from /class",
    async (_name, stored) => {
      state.storedClasses = stored;
      const { container, navigation } = mountApp();
      await openDialog(navigation);

      expect(queryClassIds()).toEqual([]);
      expect(state.hiddenItemsClasses).toEqual([]);
      expect(occurrences(container.textContent, "No classes found")).toBe(2);
      expect(container.textContent).not.toContain("All caught up!");
      expect(container.textContent).not.toContain("Class 1");
    }
  );

  it("treats a roster as unknown when the page has no current student", async () => {
    delete document.body.dataset.userid;
    const { container, navigation } = mountApp();
    await openDialog(navigation);

    expect(queryClassIds()).toEqual([]);
    expect(occurrences(container.textContent, "No classes found")).toBe(2);
  });

  it("uses the roster owned by the current student away from /class", async () => {
    addClasses(2);
    const { container, navigation } = mountApp();
    await openDialog(navigation);

    expect(queryClassIds()).toEqual([1, 2]);
    for (const { enabled } of state.queryConfigs) {
      expect(
        (enabled as (query: { state: { error: unknown } }) => boolean)({
          state: { error: null },
        })
      ).toBe(true);
    }
    expect(state.queryConfigs.map(({ queryKey }) => queryKey[2])).toEqual([
      "student-1",
      "student-1",
    ]);
    expect(state.hiddenItemsClasses.map(({ id }) => id)).toEqual([1, 2]);
    expect(container.textContent).not.toContain("No classes found");
  });

  it("drops the roster when the account changes while the dialog is open", async () => {
    addClasses(2);
    const { container, navigation } = mountApp();
    await openDialog(navigation);
    expect(queryClassIds()).toEqual([1, 2]);

    await act(async () => {
      document.body.dataset.userid = "student-2";
      await Promise.resolve();
    });

    expect(queryClassIds()).toEqual([]);
    expect(state.hiddenItemsClasses).toEqual([]);
    expect(occurrences(container.textContent, "No classes found")).toBe(2);
  });

  it("does not republish this tab's student after another tab changes the scope", async () => {
    const publish = spyOnRuntimeMessages().mockResolvedValue({ ok: true });
    const { navigation } = mountApp();
    await openDialog(navigation);

    await act(() => {
      state.storedClasses = approvedRoster("student-2", [1], "next");
      renderApp();
    });

    expect(queryClassIds()).toEqual([]);
    expect(publish).toHaveBeenCalledExactlyOnceWith({
      action: "publishEnrollment",
      classes: null,
      userId: "student-1",
    });
  });

  it("shows the empty-work state in both tabs for a confirmed empty roster", async () => {
    state.storedClasses = approvedRoster("student-1", []);
    const { container, navigation } = mountApp();
    await openDialog(navigation);

    expect(queryClassIds()).toEqual([]);
    expect(occurrences(container.textContent, "All caught up!")).toBe(2);
    expect(container.textContent).not.toContain("No classes found");
  });
});

function holdAssignmentResponse() {
  const oldResponse = Promise.withResolvers<Response>();
  const activity = {
    activity_submission_id: 0,
    class_id: 1,
    due_date: "2099-12-31T12:00:00Z",
    group_type: "IND",
    id: 101,
    type: "ASM",
  };
  const old = { ...activity, title: "Superseded assignment" };
  const fresh = { ...activity, id: 102, title: "Current assignment" };
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockReturnValueOnce(oldResponse.promise)
    .mockResolvedValueOnce(Response.json({ activities: [fresh] }));
  const send = spyOnRuntimeMessages().mockImplementation((message) =>
    Promise.resolve(
      isCacheClassAssignmentsMessage(message) &&
        message.generation === "initial"
        ? { discarded: true, ok: false }
        : { ok: true }
    )
  );
  return { fetch, fresh, old, oldResponse, send };
}

describe("in-flight assignment requests across enrollment changes", () => {
  let client: QueryClient;

  beforeEach(() => {
    resetPacingQueue();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    document.body.replaceChildren();
    document.body.dataset.userid = "student-1";
    state.storedClasses = approvedRoster();
    state.hiddenClasses = [];
    state.locale = "en";
    setPageUrl("/");
    vi.spyOn(cachedAssignmentsStorage, "getValue").mockResolvedValue([]);
    client = new QueryClient({
      defaultOptions: {
        queries: { retryDelay: 0, staleTime: 5 * 60 * 1000 },
      },
    });
    integrationQueryClient = client;
  });

  afterEach(() => {
    if (mountedRoot) {
      act(() => mountedRoot?.unmount());
      mountedRoot = null;
    }
    client.clear();
    integrationQueryClient = null;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    { change: "account", ids: [1], nextUser: "student-2" },
    { change: "roster", ids: [1, 2, 3, 4], nextUser: "student-1" },
  ])(
    "restarts eligible work after a $change change and ignores the late result",
    async ({ change, ids, nextUser }) => {
      const rosterChange = change === "roster";
      const emptyKey = assignmentQueryKey(2, "student-1");
      const limitedKey = assignmentQueryKey(3, "student-1");
      const limited = new AssignmentRequestError(429, "Too Many Requests");
      if (rosterChange) {
        addClasses(2, 3, 5);
        client.setQueryData(emptyKey, []);
        await expect(
          client.fetchQuery({
            queryFn: () => Promise.reject(limited),
            queryKey: limitedKey,
          })
        ).rejects.toBe(limited);
      }
      const { fetch, fresh, old, oldResponse, send } = holdAssignmentResponse();
      const { container, navigation } = mountApp();
      await openDialog(navigation);
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      const completedEmpty = client.getQueryState(emptyKey);

      await act(async () => {
        state.storedClasses = approvedRoster(nextUser, ids, "next");
        document.body.dataset.userid = nextUser;
        renderApp();
        await Promise.resolve();
      });
      await act(async () => {
        // The new request can start even though the old network response is held.
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        oldResponse.resolve(Response.json({ activities: [old] }));
        await vi.waitFor(() =>
          expect(client.getQueryData(assignmentQueryKey(1, nextUser))).toEqual([
            fresh,
          ])
        );
      });

      const requests = send.mock.calls.map(([message]) => message);
      expect(requests.filter(isCacheClassAssignmentsMessage)).toContainEqual({
        action: "cacheClassAssignments",
        assignments: [fresh],
        classId: 1,
        generation: "next",
        userId: nextUser,
      });
      expect(
        requests.filter(isCacheClassAssignmentsMessage)
      ).not.toContainEqual(expect.objectContaining({ generation: "initial" }));
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(container.textContent).toContain(fresh.title);
      expect(container.textContent).not.toContain(old.title);
      if (rosterChange) {
        expect(client.getQueryState(emptyKey)).toEqual(completedEmpty);
        expect(client.getQueryState(limitedKey)).toMatchObject({
          error: limited,
          fetchStatus: "idle",
        });
        expect(
          requests.filter(isCacheClassAssignmentsMessage)
        ).not.toContainEqual(expect.objectContaining({ classId: 3 }));
      } else {
        expect(
          client.getQueryData(assignmentQueryKey(1, "student-1"))
        ).toBeUndefined();
      }
    }
  );

  it("discards a worker-rejected result before the storage update reaches the tab", async () => {
    const { fetch, fresh, old, oldResponse, send } = holdAssignmentResponse();
    const { container, navigation } = mountApp();
    await openDialog(navigation);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const key = assignmentQueryKey(1, "student-1");

    await act(async () => {
      oldResponse.resolve(Response.json({ activities: [old] }));
      await vi.waitFor(() =>
        expect(client.getQueryState(key)?.error).toBeInstanceOf(
          SupersededAssignmentRequestError
        )
      );
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      send.mock.calls
        .map(([message]) => message)
        .filter(isCacheClassAssignmentsMessage)
    ).toHaveLength(1);
    expect(client.getQueryData(key)).toBeUndefined();
    expect(container.textContent).not.toContain(old.title);
    expect(container.textContent).not.toContain("All caught up!");

    await act(() => {
      state.storedClasses = approvedRoster("student-1", [1, 4], "next");
      renderApp();
    });
    await act(async () => {
      await vi.waitFor(() => expect(client.getQueryData(key)).toEqual([fresh]));
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain(fresh.title);
  });
});

function classCard(
  id: number,
  { isTeachingAssistant = false, withDescription = true } = {}
) {
  return `
    <div class="card class-card" name="class-${id}">
      <div class="card-block" id="font-color-main-card">
        <p>Class ${id}</p>${withDescription ? `<p>About ${id}</p>` : ""}
      </div>
    </div>
    ${
      isTeachingAssistant
        ? '<ul><li><div><div class="icon-setting-2 fix-oncard-btn"></div></div></li></ul>'
        : "<ul></ul>"
    }`;
}

describe("class roster sync on /class", () => {
  let publish: ReturnType<typeof spyOnRuntimeMessages>;

  beforeEach(() => {
    resetPacingQueue();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    document.body.replaceChildren();
    document.body.dataset.userid = "student-1";
    state.onScrape = null;
    state.queryConfigs = [];
    state.results = [];
    state.storedClasses = [classInfo(9)];
    setPageUrl("/class");
    publish = spyOnRuntimeMessages().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    if (mountedRoot) {
      act(() => mountedRoot?.unmount());
      mountedRoot = null;
    }
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function mountWithCards(html: string) {
    const cards = document.createElement("div");
    cards.innerHTML = html;
    document.body.append(cards);
    await act(async () => {
      mountApp();
      await Promise.resolve();
    });
  }

  it("saves the nonempty roster for the current student and skips TA cards", async () => {
    await mountWithCards(
      `${classCard(1)}${classCard(2, { isTeachingAssistant: true })}${classCard(3)}`
    );

    expect(publish).toHaveBeenCalledExactlyOnceWith({
      action: "publishEnrollment",
      classes: [
        { ...classInfo(1), description: "About 1", section: "", semester: "" },
        { ...classInfo(3), description: "About 3", section: "", semester: "" },
      ],
      userId: "student-1",
    });
  });

  it("publishes only the observed student when a card is malformed or incomplete", async () => {
    await mountWithCards(
      `${classCard(1)}${classCard(2, { withDescription: false })}`
    );

    expect(publish).toHaveBeenCalledExactlyOnceWith({
      action: "publishEnrollment",
      classes: null,
      userId: "student-1",
    });
  });

  it("keeps the stored roster when no student cards are found", async () => {
    await mountWithCards(classCard(2, { isTeachingAssistant: true }));
    expect(publish).toHaveBeenCalledExactlyOnceWith({
      action: "publishEnrollment",
      classes: null,
      userId: "student-1",
    });
  });

  it("keeps the stored roster when the page has no cards at all", async () => {
    await mountWithCards("");
    expect(publish).toHaveBeenCalledExactlyOnceWith({
      action: "publishEnrollment",
      classes: null,
      userId: "student-1",
    });
  });

  it("does not label cards with a student who took over after the scrape", async () => {
    state.onScrape = () => {
      document.body.dataset.userid = "student-2";
    };
    await mountWithCards(classCard(1));

    expect(publish).not.toHaveBeenCalled();
  });

  it("does not reuse cards left on the page when it observes a new student", async () => {
    await mountWithCards(classCard(1));
    await act(() => {
      document.querySelector<HTMLButtonElement>("button.header-link")?.click();
    });
    await act(async () => {
      document.body.dataset.userid = "student-2";
      await Promise.resolve();
    });

    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenLastCalledWith({
      action: "publishEnrollment",
      classes: null,
      userId: "student-2",
    });
  });

  it("does not save a roster when the page has no current student", async () => {
    delete document.body.dataset.userid;
    await mountWithCards(classCard(1));

    expect(publish).not.toHaveBeenCalled();
  });

  it("does not scrape away from /class", async () => {
    setPageUrl("/");
    await mountWithCards(classCard(1));

    expect(publish).toHaveBeenCalledExactlyOnceWith({
      action: "publishEnrollment",
      classes: null,
      userId: "student-1",
    });
  });
});
