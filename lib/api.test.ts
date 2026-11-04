import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAssignments,
  paceRequest,
  REQUEST_PACING_MS,
  resetPacingQueue,
  shouldRetryAssignments,
} from "@/lib/api";

describe("api logic", () => {
  beforeEach(() => {
    resetPacingQueue();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("paceRequest", () => {
    it("paces concurrent requests by REQUEST_PACING_MS", async () => {
      vi.useFakeTimers();

      const order: number[] = [];

      const runRequest = async (id: number) => {
        await paceRequest();
        order.push(id);
      };

      const p1 = runRequest(1);
      const p2 = runRequest(2);
      const p3 = runRequest(3);

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
    });
  });

  describe("fetchAssignments", () => {
    it("retains assignments without a due date for visibility filtering", async () => {
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
      expect(result).toEqual(mockActivities);
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

    it("preserves the HTTP status for rate-limit handling", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 429 })
      );
      await expect(fetchAssignments(101, "student-1")).rejects.toMatchObject({
        status: 429,
      });
    });
  });

  describe("assignment query recovery", () => {
    it("does not retry a 429 automatically but allows a manual retry", async () => {
      const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(null, { status: 429 }))
        .mockResolvedValueOnce(Response.json({ activities: [] }));
      const client = new QueryClient();
      const options = {
        queryFn: () => fetchAssignments(101, "student-1"),
        queryKey: ["assignments", 101, "student-1"],
        retry: shouldRetryAssignments,
        retryDelay: 0,
      };
      try {
        await expect(client.fetchQuery(options)).rejects.toMatchObject({
          status: 429,
        });
        expect(fetch).toHaveBeenCalledTimes(1);
        await expect(client.fetchQuery(options)).resolves.toEqual([]);
        expect(fetch).toHaveBeenCalledTimes(2);
      } finally {
        client.clear();
      }
    });

    it("retains the existing three retries for other failures", async () => {
      const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 500 }));
      const client = new QueryClient();
      try {
        await expect(
          client.fetchQuery({
            queryFn: () => fetchAssignments(101, "student-1"),
            queryKey: ["assignments", 101, "student-1"],
            retry: shouldRetryAssignments,
            retryDelay: 0,
          })
        ).rejects.toMatchObject({ status: 500 });
        expect(fetch).toHaveBeenCalledTimes(4);
      } finally {
        client.clear();
      }
    });
  });
});
