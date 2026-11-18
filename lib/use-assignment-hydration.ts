import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { AssignmentHydrationState } from "@/lib/assignment-query-cache";
import {
  getUnhydratedAssignmentClassIds,
  restoreAssignmentSnapshotWhenCurrent,
} from "@/lib/assignment-query-cache";
import { scrapeUserId } from "@/lib/dom";
import { cachedAssignmentsStorage } from "@/lib/storage";

interface UseAssignmentHydrationOptions {
  classIds: number[];
  isOpen: boolean;
}

interface AssignmentHydration {
  isHydratedForCurrentClasses: boolean;
  userId: string | null;
}

function readCurrentStudentId() {
  const userId = scrapeUserId()?.trim();
  return userId || null;
}

export function useAssignmentHydration({
  classIds,
  isOpen,
}: UseAssignmentHydrationOptions): AssignmentHydration {
  const queryClient = useQueryClient();
  const subscribe = useCallback(
    (notify: () => void) => {
      const observer = new MutationObserver(notify);
      if (isOpen) {
        observer.observe(document.documentElement, {
          attributeFilter: ["data-userid"],
          attributes: true,
          childList: true,
          subtree: true,
        });
      }
      return () => observer.disconnect();
    },
    [isOpen]
  );
  const userId = useSyncExternalStore(
    subscribe,
    readCurrentStudentId,
    readCurrentStudentId
  );
  const [hydration, setHydration] = useState<AssignmentHydrationState | null>(
    null
  );
  const classIdsToHydrate = useMemo(
    () => getUnhydratedAssignmentClassIds(classIds, userId, hydration),
    [classIds, hydration, userId]
  );
  const isHydratedForCurrentClasses =
    Boolean(userId) && classIdsToHydrate.length === 0;

  useEffect(() => {
    if (!isOpen || !userId || classIdsToHydrate.length === 0) {
      return;
    }

    let cancelled = false;
    const isCurrentStudent = () =>
      !cancelled && readCurrentStudentId() === userId;
    const hydrateAssignments = async () => {
      try {
        const restoredClassIds = await restoreAssignmentSnapshotWhenCurrent(
          queryClient,
          cachedAssignmentsStorage.getValue(),
          userId,
          classIds,
          isCurrentStudent
        );
        if (restoredClassIds === null || !isCurrentStudent()) {
          return;
        }
      } catch {
        // Loading from the persistent cache must not block the live request.
        if (!isCurrentStudent()) {
          return;
        }
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
  }, [classIds, classIdsToHydrate, isOpen, queryClient, userId]);

  return { isHydratedForCurrentClasses, userId };
}
