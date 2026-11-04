import type { ComponentProps, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AssignmentLoadError } from "@/components/assignment-load-error";
import App from "@/entrypoints/content/app";
import { fetchAssignments, resetPacingQueue } from "@/lib/api";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { classInfoStorage, hiddenClassesStorage } from "@/lib/storage";
import type { Activity, ClassInfo } from "@/types";

interface QueryResult {
  data: Activity[] | undefined;
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
  results: [] as QueryResult[],
  retry: null as (() => Promise<void>) | null,
}));

vi.mock("@/components/assignment-load-error", async (importOriginal) => {
  const actual = await importOriginal<{
    AssignmentLoadError: typeof AssignmentLoadError;
  }>();
  return {
    AssignmentLoadError: (
      props: ComponentProps<typeof actual.AssignmentLoadError>
    ) => {
      state.retry = props.onRetry;
      return <actual.AssignmentLoadError {...props} />;
    },
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueries: ({ combine }: { combine: (results: QueryResult[]) => unknown }) =>
    combine(state.results),
}));

vi.mock("@/lib/dom", () => ({ scrapeUserId: () => "student-1" }));
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
  useI18n: () => ({ t: (key: string) => translate(key, state.locale) }),
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
vi.mock("@/components/dialog-tips", () => ({ DialogTips: () => null }));
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
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: vi.fn(async () => {}),
    ...overrides,
  };
}

async function requestError(status = 429): Promise<Error> {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(null, { status, statusText: "Request failed" })
  );
  try {
    await fetchAssignments(1, "student-1");
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows rate limiting instead of claiming there are no assignments", async () => {
    state.results = [result({ error: await requestError(), isError: true })];
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("LEB2 is temporarily limiting requests");
    expect(html).toContain("Try again");
    expect(html).not.toContain("Congratulations!");
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
    expect(html).not.toContain("Congratulations!");
  });

  it("does not show failures from hidden classes", async () => {
    state.hiddenClasses = [1];
    state.results = [result({ error: await requestError(), isError: true })];
    const html = renderToStaticMarkup(<App />);
    expect(html).not.toContain("LEB2 is temporarily limiting requests");
    expect(html).toContain("Congratulations!");
  });

  it("keeps the genuine successful empty state", () => {
    state.results = [result({ data: [] })];
    expect(renderToStaticMarkup(<App />)).toContain("Congratulations!");
  });

  it("distinguishes other failures from rate limiting", async () => {
    state.results = [result({ error: await requestError(500), isError: true })];
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Unable to load assignments");
    expect(html).not.toContain("temporarily limiting requests");
    expect(html).not.toContain("Congratulations!");
  });

  it("localizes rate limiting in Thai", async () => {
    state.locale = "th";
    state.results = [result({ error: await requestError(), isError: true })];
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("LEB2 จำกัดการร้องขอชั่วคราว");
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
