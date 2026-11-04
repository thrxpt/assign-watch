import { scrapeUserId } from "@/lib/dom";
import { userIdStorage } from "@/lib/storage";
import type { RootResponse } from "@/types";

export const REQUEST_PACING_MS = 100;

export class AssignmentRequestError extends Error {
  readonly status: number;

  constructor(status: number, statusText: string) {
    super(`Failed to fetch assignments: ${status} ${statusText}`);
    this.name = "AssignmentRequestError";
    this.status = status;
  }
}

export function isRateLimitError(error: unknown): boolean {
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

export async function fetchAssignments(
  classId: number,
  userId?: string | null
) {
  await paceRequest();

  const finalUserId =
    userId ?? scrapeUserId() ?? (await userIdStorage.getValue());
  const res = await fetch(
    `https://app.leb2.org/api/get/assessment-activities/student?class_id=${classId}&student_id=${finalUserId}&filter_groups[0][filters][0][key]=class_id&filter_groups[0][filters][0][value]=${classId}&sort[]=sequence&sort[]=id&select[]=activities:id,user_id,class_id,adv_starred,group_type,type,peer_assessment,is_allow_repeat,title,description,start_date,due_date,edit_group_mode,created_at&select[]=user:id,firstname_en,lastname_en,firstname_th,lastname_th&includes[]=user:sideload&includes[]=fileactivities:ids&includes[]=questions:ids`
  );
  if (!res.ok) {
    throw new AssignmentRequestError(res.status, res.statusText);
  }
  const data = (await res.json()) as RootResponse;
  return data.activities;
}
