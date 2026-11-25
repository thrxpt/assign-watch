// @vitest-environment happy-dom

import type { ComponentProps, ReactElement, ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssignmentDialog } from "@/components/assignment-dialog";
import { formatDate, formatDateRelative, formatTime } from "@/lib/date";
import { translate } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { DEFAULT_FILTERS, DEFAULT_SORT } from "@/lib/preferences";
import type { GroupOption } from "@/lib/preferences";
import type { VisibleAssignment } from "@/lib/visible-assignments";
import type { Assignment, ClassInfo } from "@/types";

function Slot({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

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
  ScrollArea: Slot,
}));
vi.mock("@/components/ui/context-menu", () => ({
  ContextMenu: Slot,
  ContextMenuContent: Slot,
  ContextMenuItem: Slot,
  ContextMenuTrigger: ({ render }: { render: ReactElement }) => render,
}));
vi.mock("@/components/hidden-items-manager", () => ({
  HiddenItemsManager: () => null,
}));
vi.mock("@/components/assignment-filters", () => ({
  AssignmentFilters: () => null,
}));
vi.mock("@/components/assignment-sort", () => ({
  AssignmentSort: () => null,
}));
vi.mock("@/components/assignment-group", () => ({
  AssignmentGroup: () => null,
}));
vi.mock("@/components/dialog-tips", () => ({
  DialogTips: () => null,
}));
vi.mock("@/components/manual-due-date-editor", () => ({
  ManualDueDateProvider: Slot,
}));
vi.mock("@/components/manual-due-date-menu", () => ({
  ManualDueDateMenu: () => null,
}));
vi.mock("@/components/motion-preferences", () => ({
  useMotionPreferences: () => ({
    reduceMotion: false,
    setReduceMotion: vi.fn(),
  }),
}));
vi.mock("@/lib/use-i18n", () => ({
  useI18n: () => ({
    formatDate: (date: Date, formatStr: string) =>
      formatDate(date, formatStr, "en"),
    formatDateRelative: (date: Date) => formatDateRelative(date, "en"),
    t: (key: TranslationKey, substitutions?: Record<string, string | number>) =>
      translate(key, "en", substitutions),
  }),
}));
vi.mock("@/lib/use-time-format", () => ({
  useTimeFormat: () => ({
    formatTime: (date: Date) => formatTime(date, "12h"),
    setTimeFormat: vi.fn(),
    timeFormat: "12h" as const,
  }),
}));

function makeClass(id: number): ClassInfo {
  return {
    description: `Description ${id}`,
    id,
    section: "1",
    semester: "1/2026",
    title: `Class ${id}`,
  };
}

function makeAssignment(id: number, classId: number): Assignment {
  return {
    activity_group_id: null,
    activity_group_name: null,
    activity_submission_id: 0,
    activity_submission_is_late: false,
    activity_submission_submitted_at: {
      date: "",
      timezone: "Asia/Bangkok",
      timezone_type: 3,
    },
    adv_starred: 0,
    class_id: classId,
    class_user_id: 1,
    count_group_member: 0,
    created_at: "2026-09-01T00:00:00Z",
    description: "",
    due_date: "2099-12-31T12:00:00Z",
    due_date_exceed: false,
    edit_group_mode: "",
    fileactivities: [],
    group_type: "IND",
    id,
    is_allow_repeat: 0,
    peer_assessment: 0,
    questions: [],
    quiz_submission_is_submitted: 0,
    start_date: "2026-09-01T00:00:00Z",
    title: `Assignment ${id}`,
    type: "ASM",
    user: 1,
    user_id: 1,
  };
}

function makeItem(id: number, classInfo: ClassInfo): VisibleAssignment {
  return {
    assignment: makeAssignment(id, classInfo.id),
    classInfo,
  };
}

type DialogProps = ComponentProps<typeof AssignmentDialog>;

function buildProps(
  overrides: Partial<DialogProps> & { groupBy?: GroupOption } = {}
): DialogProps {
  const { groupBy = "class", ...rest } = overrides;
  return {
    allAssignments: [],
    allClassInfo: [makeClass(1)],
    calendarItems: [],
    enrollment: "known",
    filters: DEFAULT_FILTERS,
    groupState: { groupBy },
    hasFailures: false,
    hasStaleData: false,
    hiddenAssignments: [],
    hiddenClasses: [],
    isOpen: true,
    listEmptyReason: "empty",
    listItems: [],
    loadErrorProps: {
      isRateLimited: false,
      isRetrying: false,
      onRetry: vi.fn(async () => {}),
      retryAt: null,
    },
    onFiltersChange: vi.fn(),
    onGroupChange: vi.fn(),
    onOpenChange: vi.fn(),
    onOpenOptions: vi.fn(),
    onSortChange: vi.fn(),
    pendingClasses: [],
    resolvedAssignments: [],
    sortState: DEFAULT_SORT,
    userId: "student-1",
    ...rest,
  };
}

describe("AssignmentDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderDialog = (
    overrides: Partial<DialogProps> & { groupBy?: GroupOption } = {}
  ) => {
    act(() => {
      root.render(<AssignmentDialog {...buildProps(overrides)} />);
    });
  };

  const collapsedWrappers = () =>
    container.querySelectorAll('[class*="grid-rows-[0fr]"]');

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not collapse an unhidden class when the list was empty", () => {
    const class1 = makeClass(1);
    const item1 = makeItem(101, class1);

    renderDialog({
      allClassInfo: [class1],
      hiddenClasses: [1],
      listItems: [],
    });
    expect(container.textContent).toContain("All caught up!");

    renderDialog({
      allClassInfo: [class1],
      hiddenClasses: [],
      listItems: [item1],
    });

    expect(container.textContent).toContain("Assignment 101");
    expect(collapsedWrappers()).toHaveLength(0);
  });

  it("does not collapse an unhidden assignment in class view when the list was empty", () => {
    const class1 = makeClass(1);
    const item1 = makeItem(101, class1);

    renderDialog({
      allClassInfo: [class1],
      hiddenAssignments: [101],
      listItems: [],
    });

    renderDialog({
      allClassInfo: [class1],
      hiddenAssignments: [],
      listItems: [item1],
    });

    expect(container.textContent).toContain("Assignment 101");
    expect(collapsedWrappers()).toHaveLength(0);
  });

  it("does not collapse an unhidden assignment in due-date view when the list was empty", () => {
    const class1 = makeClass(1);
    const item1 = makeItem(101, class1);

    renderDialog({
      allClassInfo: [class1],
      groupBy: "dueDate",
      hiddenAssignments: [101],
      listItems: [],
    });

    renderDialog({
      allClassInfo: [class1],
      groupBy: "dueDate",
      hiddenAssignments: [],
      listItems: [item1],
    });

    expect(container.textContent).toContain("Assignment 101");
    expect(collapsedWrappers()).toHaveLength(0);
  });

  it("collapses and opens an unhidden class when another class is visible", () => {
    const class1 = makeClass(1);
    const class2 = makeClass(2);
    const item1 = makeItem(101, class1);
    const item2 = makeItem(201, class2);

    renderDialog({
      allClassInfo: [class1, class2],
      hiddenClasses: [2],
      listItems: [item1],
    });
    expect(collapsedWrappers()).toHaveLength(0);

    renderDialog({
      allClassInfo: [class1, class2],
      hiddenClasses: [],
      listItems: [item1, item2],
    });

    const collapsed = [...collapsedWrappers()];
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]?.textContent).toContain("Class 2");
    expect(collapsed[0]?.textContent).not.toContain("Class 1");
  });

  it("collapses and opens an unhidden assignment when another assignment is visible", () => {
    const class1 = makeClass(1);
    const item1 = makeItem(101, class1);
    const item2 = makeItem(102, class1);

    renderDialog({
      allClassInfo: [class1],
      hiddenAssignments: [102],
      listItems: [item1],
    });

    renderDialog({
      allClassInfo: [class1],
      hiddenAssignments: [],
      listItems: [item1, item2],
    });

    const collapsed = [...collapsedWrappers()];
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]?.textContent).toContain("Assignment 102");
    expect(collapsed[0]?.textContent).not.toContain("Assignment 101");
  });

  it("collapses and opens a second unhidden class after the first entrance finishes", () => {
    const class1 = makeClass(1);
    const class2 = makeClass(2);
    const item1 = makeItem(101, class1);
    const item2 = makeItem(201, class2);

    renderDialog({
      allClassInfo: [class1, class2],
      hiddenClasses: [1, 2],
      listItems: [],
    });

    renderDialog({
      allClassInfo: [class1, class2],
      hiddenClasses: [2],
      listItems: [item1],
    });
    expect(collapsedWrappers()).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    renderDialog({
      allClassInfo: [class1, class2],
      hiddenClasses: [],
      listItems: [item1, item2],
    });

    const collapsed = [...collapsedWrappers()];
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]?.textContent).toContain("Class 2");
  });
});
