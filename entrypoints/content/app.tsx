import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const batchAssignmentsRequest = useMemo(
    () =>
      createAssignmentsBatchRequest(
        appliedScope?.classes?.map(({ id }) => id) ?? [],
        appliedScope?.userId
      ),
    [appliedScope]
  );

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

  return { batchAssignmentsRequest, isScopeApplied, scope };
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
  const { batchAssignmentsRequest, isScopeApplied, scope } =
    useEnrollmentScope(userId);
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

  useEffect(() => {
    const button = document.createElement("button");
    button.textContent = "Assignments ✨";
    button.className = "nav-link header-link";
    button.style.border = "none";
    button.style.background = "transparent";

    const handleClick = () => {
      setIsModalOpen((prev) => {
        if (!prev) {
          batchAssignmentsRequest.reset();
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
  }, [batchAssignmentsRequest]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyA") {
        e.preventDefault();
        setIsModalOpen((prev) => {
          if (!prev) {
            batchAssignmentsRequest.reset();
          }
          return !prev;
        });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [batchAssignmentsRequest]);

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
            const data = await fetchClassAssignments(
              classInfo.id,
              scope.userId,
              batchAssignmentsRequest.fetch(),
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
  const failedQueries = assignments.results.filter(
    (result, index) =>
      result.isError &&
      !(result.error instanceof SupersededAssignmentRequestError) &&
      !hiddenClassIds.has(allClassInfo[index].id)
  );
  const hasStaleData = assignments.results.some((result, index) => {
    const classInfo = allClassInfo[index];
    return (
      classInfo !== undefined &&
      !hiddenClassIds.has(classInfo.id) &&
      Boolean(result.data?.length) &&
      (result.dataUpdatedAt === 0 || result.isError)
    );
  });
  const isBatchRateLimited = failedQueries.some(
    (result) =>
      isRateLimitError(result.error) &&
      batchAssignmentsRequest.isError(result.error)
  );
  const retryFailedQueries = async () => {
    if (!isScopeApplied) {
      return;
    }
    const refreshes: Promise<unknown>[] = [];
    if (isBatchRateLimited) {
      batchAssignmentsRequest.reset();
    }
    const retryTargets = isBatchRateLimited
      ? assignments.results
      : failedQueries;
    for (const result of retryTargets) {
      if (!result.isFetching) {
        refreshes.push(result.refetch());
      }
    }
    await Promise.all(refreshes);
  };
  let retryAt: number | null = null;
  for (const result of failedQueries) {
    if (!isRateLimitError(result.error)) {
      continue;
    }

    const rateLimitRetryAt = result.error.retryAt;
    if (rateLimitRetryAt === null) {
      continue;
    }

    retryAt =
      retryAt === null ? rateLimitRetryAt : Math.max(retryAt, rateLimitRetryAt);
  }

  const loadErrorProps = {
    isRateLimited: failedQueries.some((result) =>
      isRateLimitError(result.error)
    ),
    isRetrying: failedQueries.some((result) => result.isFetching),
    onRetry: retryFailedQueries,
    retryAt,
  };

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
      batchAssignmentsRequest.reset();
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
      hasFailures={failedQueries.length > 0}
      hasStaleData={hasStaleData}
      hiddenAssignments={hiddenAssignments}
      hiddenClasses={hiddenClasses}
      isOpen={isModalOpen}
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
