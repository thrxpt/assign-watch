import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AssignmentRequestError,
  createAssignmentsBatchRequest,
  fetchAssignments,
  fetchClassAssignments,
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

      const result = await fetchAssignments([101], "student-1");
      expect(result).toEqual(mockActivities);
    });

    it("requests all classes with only the fields the app uses", async () => {
      const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({ activities: [], user: [] }));

      await fetchAssignments([101, 202], "student-1");

      expect(fetch).toHaveBeenCalledOnce();
      const url = new URL(String(fetch.mock.calls[0][0]));
      const params = url.searchParams;
      expect(params.get("student_id")).toBe("student-1");
      expect(params.get("filter_groups[0][filters][0][key]")).toBe("class_id");
      expect(params.get("filter_groups[0][filters][0][operator]")).toBe("in");
      expect(params.getAll("filter_groups[0][filters][0][value][]")).toEqual([
        "101",
        "202",
      ]);
      expect(params.getAll("sort[]")).toEqual(["sequence", "id"]);
      expect(params.getAll("select[]")).toEqual([
        "activities:id,class_id,type,group_type,title,start_date,due_date",
      ]);
      expect(params.getAll("includes[]")).toEqual([]);
    });

    it("shares one batch request across class queries", async () => {
      const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        Response.json({
          activities: [
            { class_id: 101, id: 1 },
            { class_id: 202, id: 2 },
          ],
          user: [],
        })
      );
      const classIds = [101, 202];
      const batchRequest = createAssignmentsBatchRequest("student-1");
      const getEligibleClassIds = () => classIds;

      const results = await Promise.all([
        fetchClassAssignments(
          101,
          "student-1",
          batchRequest.fetch(101, classIds, getEligibleClassIds)
        ),
        fetchClassAssignments(
          202,
          "student-1",
          batchRequest.fetch(202, classIds, getEligibleClassIds)
        ),
      ]);

      expect(fetch).toHaveBeenCalledOnce();
      expect(results).toEqual([
        [{ class_id: 101, id: 1 }],
        [{ class_id: 202, id: 2 }],
      ]);
    });

    it("can retry a batch request after a manual 429 retry", async () => {
      const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(null, { status: 429 }))
        .mockResolvedValueOnce(Response.json({ activities: [], user: [] }));
      const classIds = [101, 202];
      const batchRequest = createAssignmentsBatchRequest("student-1");
      const automaticBatch = () =>
        batchRequest.fetch(101, classIds, () => classIds);

      const initialRequest = automaticBatch();
      await expect(initialRequest).rejects.toMatchObject({
        origin: "batch",
        status: 429,
      });
      expect(fetch).toHaveBeenCalledOnce();

      batchRequest.reset();
      await expect(automaticBatch()).rejects.toMatchObject({ origin: "batch" });
      await expect(batchRequest.retry(classIds)).resolves.toEqual([]);
      await expect(automaticBatch()).resolves.toEqual([]);

      expect(
        fetch.mock.calls.map(([input]) =>
          new URL(String(input)).searchParams.getAll(
            "filter_groups[0][filters][0][value][]"
          )
        )
      ).toEqual([
        ["101", "202"],
        ["101", "202"],
      ]);
    });

    it("returns no assignments without making a request when there are no classes", async () => {
      const fetch = vi.spyOn(globalThis, "fetch");

      await expect(fetchAssignments([], "student-1")).resolves.toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("falls back to a single-class request after a non-429 batch failure", async () => {
      const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          Response.json({ activities: [{ class_id: 101, id: 1 }], user: [] })
        );
      const batchAssignments = Promise.reject(
        new AssignmentRequestError(500, "Internal Server Error")
      );

      await expect(
        fetchClassAssignments(101, "student-1", batchAssignments)
      ).resolves.toEqual([{ class_id: 101, id: 1 }]);

      expect(fetch).toHaveBeenCalledOnce();
      const url = new URL(String(fetch.mock.calls[0][0]));
      expect(
        url.searchParams.getAll("filter_groups[0][filters][0][value][]")
      ).toEqual(["101"]);
    });

    it("does not fall back after a 429 batch failure", async () => {
      const fetch = vi.spyOn(globalThis, "fetch");
      const batchError = new AssignmentRequestError(429, "Too Many Requests");

      await expect(
        fetchClassAssignments(101, "student-1", Promise.reject(batchError))
      ).rejects.toBe(batchError);

      expect(fetch).not.toHaveBeenCalled();
    });

    it("marks a rate-limited fallback as a single-class request", async () => {
      const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        .mockResolvedValueOnce(new Response(null, { status: 429 }));
      const classIds = [101, 202];
      const batchRequest = createAssignmentsBatchRequest("student-1");

      await expect(
        fetchClassAssignments(
          202,
          "student-1",
          batchRequest.fetch(202, classIds, () => classIds)
        )
      ).rejects.toMatchObject({ origin: "class", status: 429 });
      expect(
        fetch.mock.calls.map(([input]) =>
          new URL(String(input)).searchParams.getAll(
            "filter_groups[0][filters][0][value][]"
          )
        )
      ).toEqual([["101", "202"], ["202"]]);
    });

    it("throws an error when response is not ok", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        headers: new Headers(),
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as Response);

      await expect(fetchAssignments([101], "student-1")).rejects.toThrow(
        "Failed to fetch assignments: 429 Too Many Requests"
      );
    });

    it("preserves the HTTP status for rate-limit handling", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 429 })
      );
      await expect(fetchAssignments([101], "student-1")).rejects.toMatchObject({
        retryAt: null,
        status: 429,
      });
    });

    const now = Date.parse("2026-11-17T00:00:00Z");
    it.each([
      ["60", now + 60_000],
      ["0", now],
      ["Tue, 17 Nov 2026 00:01:00 GMT", now + 60_000],
      ["Mon, 16 Nov 2026 23:59:00 GMT", now - 60_000],
      ["Tue, 01 Dec 0026 00:00:00 GMT", Date.parse("0026-12-01T00:00:00Z")],
      ["Tuesday, 17-Nov-26 00:01:00 GMT", now + 60_000],
      ["Sunday, 01-Nov-76 00:00:00 GMT", Date.parse("2076-11-01T00:00:00Z")],
      ["Thursday, 18-Nov-76 00:00:00 GMT", Date.parse("1976-11-18T00:00:00Z")],
      ["Sun Nov  1 00:00:00 2076", Date.parse("2076-11-01T00:00:00Z")],
      ["2026-11-17T00:01:00Z", null],
      ["Wed, 31 Feb 2027 00:00:00 GMT", null],
      ["Tue, 17 Nov 2026 00:01:99 GMT", null],
      ["Sat, 31 Dec 2016 23:59:60 GMT", Date.parse("2017-01-01T00:00:00Z")],
      ["9007199254740992", null],
      ["9007199254741", null],
    ])("parses a Retry-After header of %s as %s", async (header, retryAt) => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, {
          headers: { "Retry-After": header },
          status: 429,
        })
      );

      await expect(fetchAssignments([101], "student-1")).rejects.toMatchObject({
        retryAt,
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
        queryFn: () => fetchAssignments([101], "student-1"),
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
            queryFn: () => fetchAssignments([101], "student-1"),
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
