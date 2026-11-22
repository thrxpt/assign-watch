import { SupersededAssignmentRequestError } from "@/lib/assignment-cache";
import { scrapeUserId } from "@/lib/dom";
import {
  classInfoStorage,
  readEnrollmentScope,
  userIdStorage,
} from "@/lib/storage";
import type { RootResponse } from "@/types";

export const REQUEST_PACING_MS = 100;

export class AssignmentRequestError extends Error {
  readonly retryAt: number | null;
  readonly status: number;

  constructor(
    status: number,
    statusText: string,
    retryAt: number | null = null
  ) {
    super(`Failed to fetch assignments: ${status} ${statusText}`);
    this.name = "AssignmentRequestError";
    this.retryAt = retryAt;
    this.status = status;
  }
}

export function isRateLimitError(
  error: unknown
): error is AssignmentRequestError {
  return error instanceof AssignmentRequestError && error.status === 429;
}

export function shouldRetryAssignments(
  failureCount: number,
  error: Error
): boolean {
  return (
    !isRateLimitError(error) &&
    !(error instanceof SupersededAssignmentRequestError) &&
    failureCount < 3
  );
}

let lastRequestTime = 0;
let queueTail: Promise<void> = Promise.resolve();

const delay = (ms: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
};

export async function paceRequest(): Promise<void> {
  const waitTurn = queueTail;
  const { promise, resolve } = Promise.withResolvers<void>();
  queueTail = promise;
  try {
    await waitTurn;
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < REQUEST_PACING_MS) {
      await delay(REQUEST_PACING_MS - elapsed);
    }
    lastRequestTime = Date.now();
  } finally {
    resolve();
  }
}

export const resetPacingQueue = (): void => {
  lastRequestTime = 0;
  queueTail = Promise.resolve();
};

const ASSIGNMENTS_API_URL =
  "https://app.leb2.org/api/get/assessment-activities/student";

function retryDeadlineFromSeconds(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!/^\d+$/u.test(trimmedValue)) {
    return null;
  }

  const delaySeconds = Number(trimmedValue);
  const retryAt = Date.now() + delaySeconds * 1000;
  return Number.isSafeInteger(delaySeconds) && Number.isSafeInteger(retryAt)
    ? retryAt
    : null;
}

export async function fetchAssignments(
  classIds: number[],
  userId?: string | null
) {
  if (classIds.length === 0) {
    return [];
  }

  await paceRequest();

  const finalUserId =
    userId ??
    scrapeUserId() ??
    readEnrollmentScope(await classInfoStorage.getValue())?.userId ??
    (await userIdStorage.getValue());
  const params = new URLSearchParams({ student_id: String(finalUserId) });
  params.set("filter_groups[0][filters][0][key]", "class_id");
  params.set("filter_groups[0][filters][0][operator]", "in");
  for (const classId of classIds) {
    params.append("filter_groups[0][filters][0][value][]", String(classId));
  }
  params.append("sort[]", "sequence");
  params.append("sort[]", "id");
  params.append(
    "select[]",
    "activities:id,class_id,type,group_type,title,start_date,due_date"
  );

  const res = await fetch(`${ASSIGNMENTS_API_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new AssignmentRequestError(
      res.status,
      res.statusText,
      retryDeadlineFromSeconds(res.headers.get("Retry-After"))
    );
  }
  const data = (await res.json()) as RootResponse;
  return data.activities;
}

export function createAssignmentsBatchRequest(
  classIds: number[],
  userId?: string | null
) {
  let request: Promise<RootResponse["activities"]> | undefined;
  let requestError: unknown;

  const fetchBatch = async () => {
    try {
      return await fetchAssignments(classIds, userId);
    } catch (error) {
      requestError = error;
      throw error;
    }
  };

  return {
    fetch: () => {
      request ??= fetchBatch();
      return request;
    },
    isError: (error: unknown) => error === requestError,
    reset: () => {
      request = undefined;
    },
  };
}

export async function fetchClassAssignments(
  classId: number,
  userId: string | null,
  batchAssignments: Promise<RootResponse["activities"]>,
  signal?: AbortSignal
) {
  try {
    const assignments = await batchAssignments;
    return assignments.filter((assignment) => assignment.class_id === classId);
  } catch (error) {
    if (isRateLimitError(error)) {
      throw error;
    }

    signal?.throwIfAborted();
    return fetchAssignments([classId], userId);
  }
}
