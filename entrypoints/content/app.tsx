import { useQueries, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { browser } from "#imports";
import { AssignmentDialog } from "@/components/assignment-dialog";
import {
  createAssignmentsBatchRequest,
  fetchClassAssignments,
  isRateLimitError,
  shouldRetryAssignments,
} from "@/lib/api";
import {
  cacheClassAssignments,
  SupersededAssignmentRequestError,
} from "@/lib/assignment-cache";
import type { PublishEnrollmentMessage } from "@/lib/assignment-cache";
import { assignmentQueryKey } from "@/lib/assignment-query-cache";
import { readCurrentStudentId, scrapeClassCards } from "@/lib/dom";
import { resolveAssignment } from "@/lib/manual-due-dates";
import { DEFAULT_FILTERS } from "@/lib/preferences";
import {
  classInfoStorage,
  filtersStorage,
  groupStorage,
  hiddenAssignmentsStorage,
  hiddenClassesStorage,
  manualDueDatesStorage,
  NO_CLASSES,
  readEnrollmentScope,
  showUndatedAssignmentsStorage,
  sortStorage,
} from "@/lib/storage";
import {
  useAssignmentHydration,
  useCurrentStudentId,
} from "@/lib/use-assignment-hydration";
import { useStorageState } from "@/lib/use-storage-state";
import {
  getPendingClasses,
  visibleAssignments,
} from "@/lib/visible-assignments";
import type { Activity, ClassInfo, EnrollmentScope } from "@/types";

async function openOptionsPage() {
  if (typeof browser?.runtime?.openOptionsPage === "function") {
    try {
      await browser.runtime.openOptionsPage();
      return;
    } catch {
      // Fall through to message passing fallback
    }
  }

  try {
    await browser.runtime.sendMessage({ action: "openOptionsPage" });
  } catch {
    // Suppress unhandled rejection if receiver or background worker is unavailable
  }
}

async function publishObservedEnrollment(userId: string, canScrape: boolean) {
  const scraped =
    canScrape && window.location.pathname === "/class"
      ? scrapeClassCards()
      : null;
  // Check the owner again because the cards themselves do not identify it.
  if (readCurrentStudentId() !== userId) {
    return;
  }

  const message: PublishEnrollmentMessage = {
    action: "publishEnrollment",
    classes: scraped?.status === "resolved" ? scraped.classes : null,
    userId,
  };
  try {
    await browser.runtime.sendMessage(message);
  } catch {
    // The storage subscription remains authoritative if the worker is unavailable.
  }
}

function useEnrollmentScope(userId: string | null) {
  const [storedRoster] = useStorageState(classInfoStorage);
  const queryClient = useQueryClient();
  const approvedScope = readEnrollmentScope(storedRoster);
  const scope = approvedScope?.userId === userId ? approvedScope : null;
  const generation = scope?.generation;
  const [appliedScope, setAppliedScope] = useState(scope);
  const hasObservedStudent = useRef(false);
  const isScopeApplied = appliedScope?.generation === generation;

  useEffect(() => {
    if (userId) {
      // Cards left on the same page after an account switch may be stale.
      const canScrape = !hasObservedStudent.current;
      hasObservedStudent.current = true;
      void publishObservedEnrollment(userId, canScrape);
    }
  }, [userId]);

  useEffect(() => {
    if (appliedScope?.generation === generation) {
      return;
    }
    let active = true;
    const applyScope = async () => {
      const previousClassIds = new Set(
        appliedScope?.classes?.map(({ id }) => id)
      );
      // Cancel work before enabling the new generation on shared query keys.
      await queryClient.cancelQueries({
        predicate: ({ queryKey, state }) =>
          state.fetchStatus !== "idle" &&
          queryKey[0] === "assignments" &&
          typeof queryKey[1] === "number" &&
          previousClassIds.has(queryKey[1]) &&
          queryKey[2] === appliedScope?.userId,
      });
      if (active) {
        setAppliedScope(scope);
      }
    };
    void applyScope();
    return () => {
      active = false;
    };
  }, [appliedScope, generation, queryClient, scope]);

  return { isScopeApplied, scope };
}

function useDialogTriggers(
  setIsModalOpen: Dispatch<SetStateAction<boolean>>,
  resetBatchRequest: () => void
) {
  useEffect(() => {
    const button = document.createElement("button");
    button.textContent = "Assignments ✨";
    button.className = "nav-link header-link";
    button.style.border = "none";
    button.style.background = "transparent";

    const handleClick = () => {
      setIsModalOpen((prev) => {
        if (!prev) {
          resetBatchRequest();
        }
        return true;
      });
    };
    button.addEventListener("click", handleClick);

    document
      .querySelector(".nav.navbar-nav.page-menu.flex-container.fxf-rnw")
      ?.append(button);

    return () => {
      button.removeEventListener("click", handleClick);
      button.remove();
    };
  }, [resetBatchRequest, setIsModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyA") {
        e.preventDefault();
        setIsModalOpen((prev) => {
          if (!prev) {
            resetBatchRequest();
          }
          return !prev;
        });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [resetBatchRequest, setIsModalOpen]);
}

interface AssignmentQueriesOptions {
  allClassInfo: ClassInfo[];
  classIds: number[];
  hiddenClasses: number[];
  isHydratedForCurrentClasses: boolean;
  isModalOpen: boolean;
  isScopeApplied: boolean;
  scope: EnrollmentScope | null;
  userId: string | null;
}

function useAssignmentQueries({
  allClassInfo,
  classIds,
  hiddenClasses,
  isHydratedForCurrentClasses,
  isModalOpen,
  isScopeApplied,
  scope,
  userId,
}: AssignmentQueriesOptions) {
  const [retryingError, setRetryingError] = useState<
    "rate-limit" | "load-error" | null
  >(null);
  // Refetch can start before React renders the progress state.
  const retryAttempt = useRef<{
    classIds: ReadonlySet<number>;
    fetchBatch?: () => Promise<Activity[]>;
    generation: string;
    userId: string | null;
  } | null>(null);
  const batchRequests =
    useRef<
      Map<string | null, ReturnType<typeof createAssignmentsBatchRequest>>
    >(null);
  const queryClient = useQueryClient();

  const resetBatchRequest = useCallback(() => {
    batchRequests.current?.get(userId)?.reset();
  }, [userId]);

  const getBatchRequest = () => {
    const requests = (batchRequests.current ??= new Map());
    let request = requests.get(userId);
    if (!request) {
      request = createAssignmentsBatchRequest(userId);
      requests.set(userId, request);
    }
    return request;
  };

  const getCurrentRetry = () => {
    const attempt = retryAttempt.current;
    return attempt?.userId === scope?.userId &&
      attempt?.generation === scope?.generation
      ? attempt
      : null;
  };

  const getEligibleClassIds = () => {
    const attempt = getCurrentRetry();
    return classIds.filter((classId) => {
      const isDirectRetry =
        !attempt?.fetchBatch && attempt?.classIds.has(classId);
      const error = queryClient.getQueryState(
        assignmentQueryKey(classId, userId)
      )?.error;
      return !isDirectRetry && !isRateLimitError(error);
    });
  };

  const assignments = useQueries({
    combine: (results) => ({
      data: results.map((result) => result.data),
      results,
    }),
    queries: scope
      ? allClassInfo.map((classInfo) => ({
          // A 429 stays manual-only, including when the dialog is reopened.
          enabled: (query: { state: { error: unknown } }) =>
            isModalOpen &&
            isHydratedForCurrentClasses &&
            isScopeApplied &&
            !(
              query.state.error instanceof SupersededAssignmentRequestError &&
              query.state.error.generation === scope.generation
            ) &&
            !isRateLimitError(query.state.error),
          queryFn: async ({ signal }) => {
            const assertCurrentStudent = () => {
              signal.throwIfAborted();
              if (!isScopeApplied || readCurrentStudentId() !== scope.userId) {
                throw new SupersededAssignmentRequestError(scope.generation);
              }
            };
            assertCurrentStudent();
            const attempt = getCurrentRetry();
            const batch = attempt?.classIds.has(classInfo.id)
              ? attempt.fetchBatch?.()
              : getBatchRequest().fetch(
                  classInfo.id,
                  classIds,
                  getEligibleClassIds,
                  scope.generation
                );
            const data = await fetchClassAssignments(
              classInfo.id,
              scope.userId,
              batch,
              signal
            );
            assertCurrentStudent();
            const outcome = await cacheClassAssignments(
              scope,
              classInfo.id,
              data
            );
            if (outcome === "discarded") {
              throw new SupersededAssignmentRequestError(scope.generation);
            }
            assertCurrentStudent();
            return data;
          },
          queryKey: assignmentQueryKey(classInfo.id, userId),
          retry: shouldRetryAssignments,
        }))
      : [],
  });

  const hiddenClassIds = new Set(hiddenClasses);
  const classQueries = assignments.results.flatMap((result, index) => {
    const classInfo = allClassInfo[index];
    return classInfo ? [{ classId: classInfo.id, result }] : [];
  });
  const failedQueries = classQueries.filter(
    ({ classId, result }) =>
      result.isError &&
      !(result.error instanceof SupersededAssignmentRequestError) &&
      !hiddenClassIds.has(classId)
  );
  const hasStaleData = classQueries.some(
    ({ classId, result }) =>
      !hiddenClassIds.has(classId) &&
      Boolean(result.data?.length) &&
      (result.dataUpdatedAt === 0 || result.isError)
  );
  const isRateLimited = failedQueries.some(({ result }) =>
    isRateLimitError(result.error)
  );
  const isBatchRateLimited = failedQueries.some(
    ({ result }) =>
      isRateLimitError(result.error) && result.error.origin === "batch"
  );
  const retryTargets = isBatchRateLimited ? classQueries : failedQueries;
  const isRetrying =
    retryingError !== null ||
    retryTargets.some(({ result }) => result.isFetching);
  let retryAt: number | null = null;
  for (const { result } of retryTargets) {
    if (isRateLimitError(result.error) && result.error.retryAt !== null) {
      const deadline = result.error.retryAt;
      retryAt = retryAt === null ? deadline : Math.max(retryAt, deadline);
    }
  }

  const retryFailedQueries = async () => {
    if (
      !isScopeApplied ||
      !scope ||
      retryAttempt.current ||
      isRetrying ||
      retryTargets.length === 0 ||
      (retryAt !== null && retryAt > Date.now())
    ) {
      return;
    }

    let batch: Promise<Activity[]> | undefined;
    retryAttempt.current = {
      classIds: new Set(
        isRateLimited ? retryTargets.map(({ classId }) => classId) : []
      ),
      fetchBatch: isBatchRateLimited
        ? () => (batch ??= getBatchRequest().retry(classIds, scope.generation))
        : undefined,
      generation: scope.generation,
      userId: scope.userId,
    };
    setRetryingError(isRateLimited ? "rate-limit" : "load-error");
    try {
      await Promise.allSettled(
        retryTargets.map(({ result }) => result.refetch())
      );
    } finally {
      retryAttempt.current = null;
      setRetryingError(null);
    }
  };

  return {
    assignments,
    hasFailures: failedQueries.length > 0 || retryingError !== null,
    hasStaleData,
    loadErrorProps: {
      isRateLimited: isRateLimited || retryingError === "rate-limit",
      isRetrying,
      onRetry: retryFailedQueries,
      retryAt,
    },
    resetBatchRequest,
  };
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [manualDueDates] = useStorageState(manualDueDatesStorage);
  const [hiddenClasses] = useStorageState(hiddenClassesStorage);
  const [hiddenAssignments] = useStorageState(hiddenAssignmentsStorage);
  const [filters, setFilters] = useStorageState(filtersStorage);
  const [showUndatedAssignments] = useStorageState(
    showUndatedAssignmentsStorage
  );
  const [sortState, setSortState] = useStorageState(sortStorage);
  const [groupState, setGroupState] = useStorageState(groupStorage);

  const userId = useCurrentStudentId(isModalOpen);
  const { isScopeApplied, scope } = useEnrollmentScope(userId);
  const roster = scope?.classes ?? null;
  const allClassInfo = roster ?? NO_CLASSES;
  const classIds = useMemo(
    () => allClassInfo.map((classInfo) => classInfo.id),
    [allClassInfo]
  );
  const { isHydratedForCurrentClasses } = useAssignmentHydration({
    classIds,
    isOpen: isModalOpen,
    userId,
  });
  const {
    assignments,
    hasFailures,
    hasStaleData,
    loadErrorProps,
    resetBatchRequest,
  } = useAssignmentQueries({
    allClassInfo,
    classIds,
    hiddenClasses,
    isHydratedForCurrentClasses,
    isModalOpen,
    isScopeApplied,
    scope,
    userId,
  });
  useDialogTriggers(setIsModalOpen, resetBatchRequest);

  const resolvedData = assignments.data.map((items) =>
    items?.map((assignment) =>
      resolveAssignment(assignment, userId, manualDueDates)
    )
  );

  const visibility = {
    allClassInfo,
    data: resolvedData,
    filters,
    hiddenAssignments,
    hiddenClasses,
  };

  const listItems = visibleAssignments({
    ...visibility,
    includeSettled: false,
    includeUndated: showUndatedAssignments,
  });
  const listEmptyReason =
    listItems.length === 0 &&
    visibleAssignments({
      ...visibility,
      filters: DEFAULT_FILTERS,
      includeSettled: false,
      includeUndated: showUndatedAssignments,
    }).length > 0
      ? "filtered"
      : "empty";
  const calendarItems = visibleAssignments({
    ...visibility,
    includeSettled: true,
    includeUndated: false,
  });

  const pendingClasses = getPendingClasses({
    allClassInfo,
    hiddenClasses,
    results: assignments.results.map(({ data, error, isPending }) => ({
      isPending:
        isPending ||
        (data === undefined &&
          error instanceof SupersededAssignmentRequestError),
    })),
  });
  const resolvedAssignments = resolvedData.flatMap((items) => items ?? []);
  const handleDialogOpenChange = (open: boolean) => {
    if (open && !isModalOpen) {
      resetBatchRequest();
    }
    setIsModalOpen(open);
  };

  return (
    <AssignmentDialog
      allAssignments={assignments.data}
      allClassInfo={allClassInfo}
      calendarItems={calendarItems}
      enrollment={roster === null ? "unknown" : "known"}
      filters={filters}
      groupState={groupState}
      hasFailures={hasFailures}
      hasStaleData={hasStaleData}
      hiddenAssignments={hiddenAssignments}
      hiddenClasses={hiddenClasses}
      isOpen={isModalOpen}
      listEmptyReason={listEmptyReason}
      listItems={listItems}
      loadErrorProps={loadErrorProps}
      onFiltersChange={setFilters}
      onGroupChange={setGroupState}
      onOpenChange={handleDialogOpenChange}
      onOpenOptions={openOptionsPage}
      onSortChange={setSortState}
      pendingClasses={pendingClasses}
      resolvedAssignments={resolvedAssignments}
      sortState={sortState}
      userId={userId}
    />
  );
}

export default App;
