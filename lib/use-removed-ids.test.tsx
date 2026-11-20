// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRemovedIds } from "@/lib/use-removed-ids";

function RemovedIdsProbe({ ids }: { ids: number[] }) {
  const removed = useRemovedIds(ids);
  return <span>{[...removed].join(",")}</span>;
}

describe("useRemovedIds", () => {
  let container: HTMLDivElement;
  let root: Root;

  const show = (ids: number[]) => {
    act(() => root.render(<RemovedIdsProbe ids={ids} />));
  };
  const removed = () => container.textContent;

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

  it("keeps a removed ID flagged for the entrance window", () => {
    show([1, 2]);
    expect(removed()).toBe("");

    show([2]);
    expect(removed()).toBe("1");

    act(() => vi.advanceTimersByTime(499));
    expect(removed()).toBe("1");

    act(() => vi.advanceTimersByTime(1));
    expect(removed()).toBe("");
  });

  it("does not flag IDs added after the initial render", () => {
    show([1]);
    show([1, 2]);
    act(() => vi.advanceTimersByTime(0));
    expect(removed()).toBe("");

    show([1]);
    expect(removed()).toBe("2");
  });
});
