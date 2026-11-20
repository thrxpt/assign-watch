import { useEffect, useState } from "react";

/** Long enough to cover the card and group entrance animations. */
const ENTER_WINDOW_MS = 500;

/**
 * Returns the IDs that were present before the latest change but are missing
 * now, and keeps them flagged until the entrance animation has finished.
 * Loading data only adds IDs, so it never triggers the flag.
 */
export function useRemovedIds<T extends string | number>(
  ids: readonly T[]
): ReadonlySet<T> {
  const [trackedIds, setTrackedIds] = useState<readonly T[]>(ids);

  const currentIds = new Set(ids);
  const removed = new Set<T>();
  for (const id of trackedIds) {
    if (!currentIds.has(id)) {
      removed.add(id);
    }
  }

  useEffect(() => {
    const current = new Set(ids);
    const hasRemoved = trackedIds.some((id) => !current.has(id));

    // Defer the baseline update: synchronous state writes in an effect cause a
    // cascading render, and a removal must stay flagged for its animation.
    const timeout = window.setTimeout(
      () => setTrackedIds(ids),
      hasRemoved ? ENTER_WINDOW_MS : 0
    );
    return () => window.clearTimeout(timeout);
  }, [ids, trackedIds]);

  return removed;
}
