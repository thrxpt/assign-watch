import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { AssignmentRequestError } from "@/lib/api";
import {
  assignmentQueryKey,
  getUnhydratedAssignmentClassIds,
  restoreAssignmentSnapshot,
  restoreAssignmentSnapshotWhenCurrent,
} from "@/lib/assignment-query-cache";
import type { Activity, AssignmentSnapshot } from "@/types";

function createActivity(classId: number, id: number): Activity {
  return { class_id: classId, id, title: `Assignment ${id}` } as Activity;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe("restoreAssignmentSnapshot", () => {
  it("keeps assignment queries gated until the deferred snapshot is restored", async () => {
    const queryClient = createQueryClient();
    const classIds = [1];
    const userId = "student-1";
    const assignment = createActivity(1, 10);
    const { promise: snapshotPromise, resolve } = Promise.withResolvers<
      Activity[] | AssignmentSnapshot
    >();
    let hydration: { classIds: number[]; userId: string } | null = null;
    const unhydratedClassIds = () =>
      getUnhydratedAssignmentClassIds(classIds, userId, hydration);

    const restoring = restoreAssignmentSnapshotWhenCurrent(
      queryClient,
      snapshotPromise,
      userId,
      classIds,
      () => true
    ).then((restoredClassIds) => {
      expect(restoredClassIds).toEqual([1]);
      hydration = { classIds, userId };
    });

    expect(unhydratedClassIds()).toEqual([1]);
    expect(
      queryClient.getQueryData(assignmentQueryKey(1, userId))
    ).toBeUndefined();
    resolve({ assignments: [assignment], userId });
    await restoring;

    expect(unhydratedClassIds()).toEqual([]);
    expect(queryClient.getQueryData(assignmentQueryKey(1, userId))).toEqual([
      assignment,
    ]);
    queryClient.clear();
  });

  it("does not restore rows after the current student ID disappears", async () => {
    const queryClient = createQueryClient();
    const { promise: snapshotPromise, resolve } = Promise.withResolvers<
      Activity[] | AssignmentSnapshot
    >();
    let currentUserId = "student-1";
    const restoring = restoreAssignmentSnapshotWhenCurrent(
      queryClient,
      snapshotPromise,
      "student-1",
      [1],
      () => Boolean(currentUserId) && currentUserId === "student-1"
    );

    currentUserId = "";
    resolve({ assignments: [createActivity(1, 10)], userId: "student-1" });

    await expect(restoring).resolves.toBeNull();
    expect(
      queryClient.getQueryState(assignmentQueryKey(1, "student-1"))
    ).toBeUndefined();
    queryClient.clear();
  });

  it("restores only nonempty rows for enrolled classes owned by this student", () => {
    const queryClient = createQueryClient();
    const assignment = createActivity(1, 10);
    const otherClassAssignment = createActivity(3, 30);

    const restored = restoreAssignmentSnapshot(
      queryClient,
      {
        assignments: [assignment, otherClassAssignment],
        userId: "student-1",
      },
      "student-1",
      [1, 2]
    );

    expect(restored).toEqual([1]);
    expect(
      queryClient.getQueryData(assignmentQueryKey(1, "student-1"))
    ).toEqual([assignment]);
    expect(
      queryClient.getQueryState(assignmentQueryKey(1, "student-1"))
        ?.dataUpdatedAt
    ).toBe(0);
    expect(
      queryClient.getQueryState(assignmentQueryKey(2, "student-1"))
    ).toBeUndefined();
    expect(
      queryClient.getQueryState(assignmentQueryKey(3, "student-1"))
    ).toBeUndefined();
    queryClient.clear();
  });

  it("ignores legacy and other-student snapshots", () => {
    const queryClient = createQueryClient();
    const assignment = createActivity(1, 10);

    expect(
      restoreAssignmentSnapshot(queryClient, [assignment], "student-1", [1])
    ).toEqual([]);
    expect(
      restoreAssignmentSnapshot(
        queryClient,
        { assignments: [assignment], userId: "student-2" },
        "student-1",
        [1]
      )
    ).toEqual([]);
    expect(
      queryClient.getQueryState(assignmentQueryKey(1, "student-1"))
    ).toBeUndefined();
    queryClient.clear();
  });

  it("preserves successful query data, including an empty result", () => {
    const queryClient = createQueryClient();
    const assignment = createActivity(2, 20);
    const firstKey = assignmentQueryKey(1, "student-1");
    const secondKey = assignmentQueryKey(2, "student-1");
    queryClient.setQueryData(firstKey, []);
    queryClient.setQueryData(secondKey, [assignment]);
    const firstUpdatedAt = queryClient.getQueryState(firstKey)?.dataUpdatedAt;
    const secondUpdatedAt = queryClient.getQueryState(secondKey)?.dataUpdatedAt;

    const restored = restoreAssignmentSnapshot(
      queryClient,
      {
        assignments: [createActivity(1, 10), assignment],
        userId: "student-1",
      },
      "student-1",
      [1, 2]
    );

    expect(restored).toEqual([]);
    expect(queryClient.getQueryData(firstKey)).toEqual([]);
    expect(queryClient.getQueryState(firstKey)?.dataUpdatedAt).toBe(
      firstUpdatedAt
    );
    expect(queryClient.getQueryData(secondKey)).toEqual([assignment]);
    expect(queryClient.getQueryState(secondKey)?.dataUpdatedAt).toBe(
      secondUpdatedAt
    );
    queryClient.clear();
  });

  it("preserves errors and active requests", async () => {
    const queryClient = createQueryClient();
    const errorKey = assignmentQueryKey(1, "student-1");
    const requestKey = assignmentQueryKey(2, "student-1");
    const rateLimitError = new AssignmentRequestError(429, "Too Many Requests");
    await expect(
      queryClient.fetchQuery({
        queryFn: () => Promise.reject(rateLimitError),
        queryKey: errorKey,
      })
    ).rejects.toBe(rateLimitError);

    const { promise: requestPromise, resolve: finishRequest } =
      Promise.withResolvers<Activity[]>();
    const activeRequest = queryClient.fetchQuery({
      queryFn: () => requestPromise,
      queryKey: requestKey,
    });
    await vi.waitFor(() => {
      expect(queryClient.getQueryState(requestKey)?.fetchStatus).toBe(
        "fetching"
      );
    });

    const restored = restoreAssignmentSnapshot(
      queryClient,
      {
        assignments: [createActivity(1, 10), createActivity(2, 20)],
        userId: "student-1",
      },
      "student-1",
      [1, 2]
    );

    expect(restored).toEqual([]);
    expect(queryClient.getQueryState(errorKey)?.error).toBe(rateLimitError);
    expect(queryClient.getQueryState(requestKey)?.fetchStatus).toBe("fetching");
    finishRequest([createActivity(2, 20)]);
    await activeRequest;
    queryClient.clear();
  });
});
