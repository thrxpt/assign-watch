import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { browser } from "#imports";
import { AssignmentDialog } from "@/components/assignment-dialog";
import {
  createAssignmentsBatchRequest,
  fetchClassAssignments,
  isRateLimitError,
  shouldRetryAssignments,
} from "@/lib/api";
import { cacheClassAssignments } from "@/lib/assignment-cache";
import type { AssignmentHydrationState } from "@/lib/assignment-query-cache";
import {
  assignmentQueryKey,
  getUnhydratedAssignmentClassIds,
  restoreAssignmentSnapshotWhenCurrent,
} from "@/lib/assignment-query-cache";
import { scrapeClassCards, scrapeUserId } from "@/lib/dom";
import { resolveAssignment } from "@/lib/manual-due-dates";
import {
  cachedAssignmentsStorage,
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
  const [hydration, setHydration] = useState<AssignmentHydrationState | null>(
    null
  );

  const [allClassInfo] = useStorageState(classInfoStorage);
  const [userId, setUserId] = useState(() => scrapeUserId() ?? null);
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
  const queryClient = useQueryClient();
  const classIdsToHydrate = useMemo(
    () => getUnhydratedAssignmentClassIds(classIds, userId, hydration),
    [classIds, hydration, userId]
  );
  const isHydratedForCurrentClasses = !userId || classIdsToHydrate.length === 0;
  const batchAssignmentsRequest = useMemo(
    () => createAssignmentsBatchRequest(classIds, userId),
    [classIds, userId]
  );

  useEffect(() => {
    if (!isModalOpen || !userId?.trim() || classIdsToHydrate.length === 0) {
      return;
    }

    let cancelled = false;
    const hydrateAssignments = async () => {
      try {
        const restoredClassIds = await restoreAssignmentSnapshotWhenCurrent(
          queryClient,
          cachedAssignmentsStorage.getValue(),
          userId,
          classIds,
          () => !cancelled && scrapeUserId() === userId
        );
        if (restoredClassIds === null) {
          return;
        }
      } catch {
        // Loading from the persistent cache must not block the live request.
        if (cancelled || scrapeUserId() !== userId) {
          return;
        }
      }

      if (cancelled) {
        return;
      }

      setHydration((current) => {
        const hydratedClassIds =
          current?.userId === userId ? current.classIds : [];
        return {
          classIds: [...new Set([...hydratedClassIds, ...classIds])],
          userId,
        };
      });
    };

    void hydrateAssignments();
    return () => {
      cancelled = true;
    };
  }, [classIds, classIdsToHydrate, isModalOpen, queryClient, userId]);

  useEffect(() => {
    const syncInfo = async () => {
      const userIdFromDom = scrapeUserId();
      if (userIdFromDom) {
        setUserId(userIdFromDom);
        await userIdStorage.setValue(userIdFromDom);
      }

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
        const data = await fetchClassAssignments(
          classInfo.id,
          userId,
          batchAssignmentsRequest.fetch()
        );
        await cacheClassAssignments(userId, classInfo.id, data, classIds);
        return data;
      },
      queryKey: assignmentQueryKey(classInfo.id, userId),
      retry: shouldRetryAssignments,
    })),
  });

  const hiddenClassIds = new Set(hiddenClasses);
  const failedQueries = assignments.results.filter(
    (result, index) =>
      result.isError && !hiddenClassIds.has(allClassInfo[index].id)
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
