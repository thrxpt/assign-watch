import { useQueries } from "@tanstack/react-query";
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
  selectClassRoster,
  showUndatedAssignmentsStorage,
  sortStorage,
  userIdStorage,
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

/**
 * Saves the roster shown on `/class` for the student the page identifies. An
 * unresolved scrape or a changed student leaves the stored roster alone.
 */
async function syncClassRoster() {
  if (window.location.pathname !== "/class") {
    return;
  }

  const userId = readCurrentStudentId();
  if (!userId) {
    return;
  }

  const scraped = scrapeClassCards();
  if (scraped.status !== "resolved") {
    return;
  }

  // The cards carry no owner, so never label them with a student who took
  // over the page after they were read.
  if (readCurrentStudentId() !== userId) {
    return;
  }

  await classInfoStorage.setValue({ classes: scraped.classes, userId });
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [storedRoster] = useStorageState(classInfoStorage);
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
  // Only the signed-in student's own roster may drive requests or titles.
  const roster = useMemo(
    () => selectClassRoster(storedRoster, userId),
    [storedRoster, userId]
  );
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
    void syncClassRoster();
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
