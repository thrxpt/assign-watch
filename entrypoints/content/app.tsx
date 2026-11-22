import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { browser } from "#imports";
import { AssignmentDialog } from "@/components/assignment-dialog";
import {
  createAssignmentsBatchRequest,
  fetchClassAssignments,
  isRateLimitError,
  shouldRetryAssignments,
} from "@/lib/api";
import { cacheClassAssignments } from "@/lib/assignment-cache";
import { assignmentQueryKey } from "@/lib/assignment-query-cache";
import { scrapeClassCards } from "@/lib/dom";
import { resolveAssignment } from "@/lib/manual-due-dates";
import {
  classInfoStorage,
  filtersStorage,
  groupStorage,
  hiddenAssignmentsStorage,
  hiddenClassesStorage,
  manualDueDatesStorage,
  showUndatedAssignmentsStorage,
  sortStorage,
  userIdStorage,
} from "@/lib/storage";
import { useAssignmentHydration } from "@/lib/use-assignment-hydration";
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

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [retryingError, setRetryingError] = useState<
    "rate-limit" | "load-error" | null
  >(null);
  // Refetch can start before React renders the progress state.
  const retryAttempt = useRef<{
    directClassIds: ReadonlySet<number>;
    userId: string | null;
  } | null>(null);

  const [allClassInfo] = useStorageState(classInfoStorage);
  const [manualDueDates] = useStorageState(manualDueDatesStorage);
  const [hiddenClasses] = useStorageState(hiddenClassesStorage);
  const [hiddenAssignments] = useStorageState(hiddenAssignmentsStorage);
  const [filters, setFilters] = useStorageState(filtersStorage);
  const [showUndatedAssignments] = useStorageState(
    showUndatedAssignmentsStorage
  );
  const [sortState, setSortState] = useStorageState(sortStorage);
  const [groupState, setGroupState] = useStorageState(groupStorage);

  const classIds = useMemo(
    () => allClassInfo.map((classInfo) => classInfo.id),
    [allClassInfo]
  );
  const { isHydratedForCurrentClasses, userId } = useAssignmentHydration({
    classIds,
    isOpen: isModalOpen,
  });
  const batchAssignmentsRequest = useMemo(
    () => createAssignmentsBatchRequest(classIds, userId),
    [classIds, userId]
  );

  useEffect(() => {
    if (userId?.trim()) {
      void userIdStorage.setValue(userId);
    }
  }, [userId]);

  useEffect(() => {
    const syncInfo = async () => {
      if (window.location.pathname === "/class") {
        const scraped = scrapeClassCards();
        if (scraped.length > 0) {
          await classInfoStorage.setValue(scraped);
        }
      }
    };

    void syncInfo();
  }, []);

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
    queries: allClassInfo.map((classInfo) => ({
      // A 429 stays manual-only, including when the dialog is reopened.
      enabled: (query: { state: { error: unknown } }) =>
        isModalOpen &&
        isHydratedForCurrentClasses &&
        !isRateLimitError(query.state.error),
      queryFn: async () => {
        const attempt = retryAttempt.current;
        const fetchDirectly =
          attempt?.userId === userId &&
          attempt.directClassIds.has(classInfo.id);
        const data = await fetchClassAssignments(
          classInfo.id,
          userId,
          fetchDirectly ? undefined : batchAssignmentsRequest.fetch()
        );
        await cacheClassAssignments(userId, classInfo.id, data, classIds);
        return data;
      },
      queryKey: assignmentQueryKey(classInfo.id, userId),
      retry: shouldRetryAssignments,
    })),
  });

  const hiddenClassIds = new Set(hiddenClasses);
  const classQueries = assignments.results.map((result, index) => ({
    classId: allClassInfo[index].id,
    result,
  }));
  const failedQueries = classQueries.filter(
    ({ classId, result }) => result.isError && !hiddenClassIds.has(classId)
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
      retryAttempt.current ||
      isRetrying ||
      retryTargets.length === 0 ||
      (retryAt !== null && retryAt > Date.now())
    ) {
      return;
    }

    if (isBatchRateLimited) {
      batchAssignmentsRequest.reset();
    }
    retryAttempt.current = {
      directClassIds: new Set(
        isRateLimited && !isBatchRateLimited
          ? retryTargets.map(({ classId }) => classId)
          : []
      ),
      userId,
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

  const loadErrorProps = {
    isRateLimited: isRateLimited || retryingError === "rate-limit",
    isRetrying,
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
    results: assignments.results,
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
      filters={filters}
      groupState={groupState}
      hasFailures={failedQueries.length > 0 || retryingError !== null}
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
