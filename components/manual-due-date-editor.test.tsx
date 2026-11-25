// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ManualDueDateProvider,
  useManualDueDateEditor,
} from "@/components/manual-due-date-editor";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { saveManualDueDate } from "@/lib/manual-due-date-storage";
import type { Assignment } from "@/types";

const state = vi.hoisted(() => ({
  locale: "en" as Locale,
}));

vi.mock("@/lib/manual-due-date-storage", () => ({
  saveManualDueDate: vi.fn(),
}));

vi.mock("@/lib/use-i18n", () => ({
  useI18n: () => ({
    t: (key: string, substitutions?: Record<string, string | number>) =>
      translate(key, state.locale, substitutions),
  }),
}));

function Slot({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

vi.mock("@/components/ui/dialog", () => ({
  Dialog: Slot,
  DialogContent: Slot,
  DialogDescription: Slot,
  DialogFooter: Slot,
  DialogHeader: Slot,
  DialogTitle: Slot,
}));

function RemoveTrigger({ assignment }: { assignment: Assignment }) {
  const { removeDate } = useManualDueDateEditor();
  return (
    <button onClick={() => void removeDate(assignment)} type="button">
      Remove
    </button>
  );
}

const assignment = {
  activity_submission_id: 0,
  class_id: 1,
  due_date: null,
  due_date_exceed: false,
  group_type: "IND",
  id: 42,
  manualDueDate: "2026-11-10T16:59:00.000Z",
  start_date: "2026-09-01T00:00:00Z",
  title: "Lab 1",
  type: "ASM",
} as Assignment;

describe("ManualDueDateProvider", () => {
  let root: Root | null = null;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    state.locale = "en";
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = null;
    }
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the remove-specific error message when removing a manual due date fails and updates on locale switch", async () => {
    vi.mocked(saveManualDueDate).mockRejectedValueOnce(
      new Error("storage full")
    );
    const renderTree = () =>
      root?.render(
        <ManualDueDateProvider assignments={[assignment]} userId="student-1">
          <RemoveTrigger assignment={assignment} />
        </ManualDueDateProvider>
      );

    act(renderTree);

    const button = container.querySelector("button");
    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe(
      "Could not remove the manual due date. Your previous due date was not changed. Please try again."
    );

    state.locale = "th";
    act(renderTree);

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "ไม่สามารถลบกำหนดส่งที่ตั้งเองได้ กำหนดส่งเดิมยังคงไม่เปลี่ยนแปลง โปรดลองอีกครั้ง"
    );
  });
});
