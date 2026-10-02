import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAssignments,
  paceRequest,
  REQUEST_PACING_MS,
  resetPacingQueue,
} from "@/lib/api";

describe("api logic", () => {
  beforeEach(() => {
    resetPacingQueue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("paceRequest", () => {
    it("paces concurrent requests by REQUEST_PACING_MS", async () => {
      vi.useFakeTimers();

      const order: number[] = [];

      const p1 = paceRequest().then(() => {
        order.push(1);
      });
      const p2 = paceRequest().then(() => {
        order.push(2);
      });
      const p3 = paceRequest().then(() => {
        order.push(3);
      });

      // p1 should resolve immediately
      await vi.advanceTimersByTimeAsync(0);
      expect(order).toEqual([1]);

      // p2 should resolve after REQUEST_PACING_MS
      await vi.advanceTimersByTimeAsync(REQUEST_PACING_MS);
      expect(order).toEqual([1, 2]);

      // p3 should resolve after another REQUEST_PACING_MS
      await vi.advanceTimersByTimeAsync(REQUEST_PACING_MS);
      expect(order).toEqual([1, 2, 3]);

      await Promise.all([p1, p2, p3]);
      vi.useRealTimers();
    });
  });

  describe("fetchAssignments", () => {
    it("filters out activities with null due_date", async () => {
      const mockActivities = [
        { due_date: "2026-10-10T12:00:00Z", id: 1, title: "Activity 1" },
        { due_date: null, id: 2, title: "Activity 2" },
        { due_date: "2026-10-15T12:00:00Z", id: 3, title: "Activity 3" },
      ];

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        json: () => Promise.resolve({ activities: mockActivities, user: [] }),
        ok: true,
      } as Response);

      const result = await fetchAssignments(101, "student-1");
      expect(result).toHaveLength(2);
      expect(result.map((a) => a.id)).toEqual([1, 3]);
    });

    it("throws an error when response is not ok", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as Response);

      await expect(fetchAssignments(101, "student-1")).rejects.toThrow(
        "Failed to fetch assignments: 429 Too Many Requests"
      );
    });
  });
});
