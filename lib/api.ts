import { scrapeUserId } from "@/lib/dom";
import { userIdStorage } from "@/lib/storage";
import type { RootResponse } from "@/types";

export const REQUEST_PACING_MS = 100;

type AssignmentRequestOrigin = "batch" | "class";

export class AssignmentRequestError extends Error {
  readonly origin: AssignmentRequestOrigin | null;
  readonly retryAt: number | null;
  readonly status: number;

  constructor(
    status: number,
    statusText: string,
    retryAt: number | null = null,
    origin: AssignmentRequestOrigin | null = null
  ) {
    super(`Failed to fetch assignments: ${status} ${statusText}`);
    this.name = "AssignmentRequestError";
    this.origin = origin;
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
  return !isRateLimitError(error) && failureCount < 3;
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

const DELAY_SECONDS = /^\d+$/u;
const IMF_FIXDATE =
  /^(?<weekday>Mon|Tue|Wed|Thu|Fri|Sat|Sun), (?<day>\d{2}) (?<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (?<year>\d{4}) (?<time>\d{2}:\d{2}:\d{2}) GMT$/u;
const RFC_850_DATE =
  /^(?<weekday>Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (?<day>\d{2})-(?<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(?<year>\d{2}) (?<time>\d{2}:\d{2}:\d{2}) GMT$/u;
const ASCTIME_DATE =
  /^(?<weekday>Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (?<day>\d{2}| \d) (?<time>\d{2}:\d{2}:\d{2}) (?<year>\d{4})$/u;
const HTTP_TIME = /^(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d|23:59:60)$/u;

function parseHttpDate(value: string): number | null {
  const date =
    IMF_FIXDATE.exec(value) ??
    RFC_850_DATE.exec(value) ??
    ASCTIME_DATE.exec(value);
  if (!date?.groups) {
    return null;
  }

  const { weekday, day, month, year, time } = date.groups;
  if (!HTTP_TIME.test(time)) {
    return null;
  }

  const isLeapSecond = time === "23:59:60";
  const parsedTime = isLeapSecond ? "23:59:59" : time;
  const parseYear = (fullYear: string) =>
    Date.parse(
      `${weekday.slice(0, 3)}, ${day.trim().padStart(2, "0")} ${month} ${fullYear} ${parsedTime} GMT`
    );
  let retryAt: number;
  if (year.length === 2) {
    // RFC 9110 limits obsolete two-digit years to 50 years in the future.
    const limit = new Date();
    const latestYear = limit.getUTCFullYear() + 50;
    limit.setUTCFullYear(latestYear);
    const candidateYear = latestYear - ((latestYear - Number(year)) % 100);
    retryAt = parseYear(String(candidateYear));
    if (retryAt > limit.getTime()) {
      retryAt = parseYear(String(candidateYear - 100));
    }
  } else {
    retryAt = parseYear(year);
  }

  if (new Date(retryAt).getUTCDate() !== Number(day)) {
    return null;
  }

  return retryAt + (isLeapSecond ? 1000 : 0);
}

function retryDeadlineFromHeader(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!DELAY_SECONDS.test(trimmedValue)) {
    return parseHttpDate(trimmedValue);
  }

  const delaySeconds = Number(trimmedValue);
  const retryAt = Date.now() + delaySeconds * 1000;
  return Number.isSafeInteger(delaySeconds) && Number.isSafeInteger(retryAt)
    ? retryAt
    : null;
}

export async function fetchAssignments(
  classIds: number[],
  userId?: string | null,
  origin: AssignmentRequestOrigin = "batch"
) {
  if (classIds.length === 0) {
    return [];
  }

  await paceRequest();

  const finalUserId =
    userId ?? scrapeUserId() ?? (await userIdStorage.getValue());
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
      retryDeadlineFromHeader(res.headers.get("Retry-After")),
      origin
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

  return {
    fetch: () => {
      request ??= fetchAssignments(classIds, userId);
      return request;
    },
    reset: () => {
      request = undefined;
    },
  };
}

export async function fetchClassAssignments(
  classId: number,
  userId: string | null,
  batchAssignments?: Promise<RootResponse["activities"]>
) {
  if (batchAssignments) {
    try {
      const assignments = await batchAssignments;
      return assignments.filter(
        (assignment) => assignment.class_id === classId
      );
    } catch (error) {
      if (isRateLimitError(error)) {
        throw error;
      }
    }
  }
  return fetchAssignments([classId], userId, "class");
}
