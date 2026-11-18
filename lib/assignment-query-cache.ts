import type { QueryClient } from "@tanstack/react-query";

import { readAssignmentSnapshot } from "@/lib/manual-due-dates";
import type { Activity, AssignmentSnapshot } from "@/types";

export interface AssignmentHydrationState {
  classIds: number[];
  userId: string;
}

export function assignmentQueryKey(classId: number, userId: string | null) {
  return ["assignments", classId, userId] as const;
}

export function getUnhydratedAssignmentClassIds(
  classIds: number[],
  userId: string | null,
  hydration: AssignmentHydrationState | null
): number[] {
  if (!userId) {
    return [];
  }

  const hydratedClassIds = new Set(
    hydration?.userId === userId ? hydration.classIds : []
  );
  return classIds.filter((classId) => !hydratedClassIds.has(classId));
}

export function restoreAssignmentSnapshot(
  queryClient: QueryClient,
  value: Activity[] | AssignmentSnapshot,
  userId: string,
  classIds: number[]
): number[] {
  if (!userId.trim()) {
    return [];
  }

  const snapshot = readAssignmentSnapshot(value);
  if (snapshot.userId !== userId || !Array.isArray(snapshot.assignments)) {
    return [];
  }

  const enrolledClassIds = new Set(classIds);
  const assignmentsByClass = new Map<number, Activity[]>();
  for (const assignment of snapshot.assignments) {
    if (!enrolledClassIds.has(assignment.class_id)) {
      continue;
    }

    const assignments = assignmentsByClass.get(assignment.class_id);
    if (assignments) {
      assignments.push(assignment);
    } else {
      assignmentsByClass.set(assignment.class_id, [assignment]);
    }
  }

  const restoredClassIds: number[] = [];
  for (const classId of classIds) {
    const assignments = assignmentsByClass.get(classId);
    if (!assignments?.length) {
      continue;
    }

    const queryKey = assignmentQueryKey(classId, userId);
    const queryState = queryClient.getQueryState(queryKey);
    if (
      queryState &&
      (queryState.data !== undefined ||
        queryState.error !== null ||
        queryState.fetchStatus !== "idle")
    ) {
      continue;
    }

    queryClient.setQueryData(queryKey, assignments, { updatedAt: 0 });
    restoredClassIds.push(classId);
  }

  return restoredClassIds;
}

export async function restoreAssignmentSnapshotWhenCurrent(
  queryClient: QueryClient,
  snapshotPromise: Promise<Activity[] | AssignmentSnapshot>,
  userId: string,
  classIds: number[],
  isCurrent: () => boolean
): Promise<number[] | null> {
  const snapshot = await snapshotPromise;
  if (!userId.trim() || !isCurrent()) {
    return null;
  }

  return restoreAssignmentSnapshot(queryClient, snapshot, userId, classIds);
}
