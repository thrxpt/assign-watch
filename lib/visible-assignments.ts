import { isSubmitted } from "@/lib/assignment";
import type { FilterState } from "@/lib/preferences";
import type { Activity, ClassInfo } from "@/types";

export interface VisibleAssignment {
  assignment: Activity;
  classInfo: ClassInfo;
}

export function passesFilters(assignment: Activity, filters: FilterState) {
  const submitted = isSubmitted(assignment);
  if (submitted && !filters.submissionStatus.submitted) {
    return false;
  }
  if (!(submitted || filters.submissionStatus.notSubmitted)) {
    return false;
  }

  const isAssignment = assignment.type === "ASM";
  if (isAssignment && !filters.assignmentType.assignment) {
    return false;
  }
  if (!(isAssignment || filters.assignmentType.quiz)) {
    return false;
  }

  const isIndividual = assignment.group_type === "IND";
  if (isIndividual && !filters.groupType.individual) {
    return false;
  }
  if (!(isIndividual || filters.groupType.group)) {
    return false;
  }

  return true;
}

/** Past its due date and already handed in — nothing left to do. */
export function isSettled(assignment: Activity) {
  return assignment.due_date_exceed && isSubmitted(assignment);
}

interface VisibleAssignmentsParams {
  allClassInfo: ClassInfo[];
  data: (Activity[] | undefined)[];
  filters: FilterState;
  hiddenAssignments: number[];
  hiddenClasses: number[];
  /** The list drops settled work; the calendar keeps it as history. */
  includeSettled: boolean;
}
export interface PendingQueryResult {
  isPending: boolean;
}

export interface PendingClassesParams {
  allClassInfo: ClassInfo[];
  hiddenClasses: number[];
  results: PendingQueryResult[];
}

/**
 * Returns classes that are currently pending fetch and not hidden by the user.
 */
export const getPendingClasses = ({
  allClassInfo,
  hiddenClasses,
  results,
}: PendingClassesParams): ClassInfo[] => {
  const hiddenClassIds = new Set(hiddenClasses);
  return allClassInfo.filter(
    (cls, index) => !hiddenClassIds.has(cls.id) && results[index]?.isPending
  );
};

/**
 * Every rule that can remove an assignment from view. Both the list and the
 * calendar go through here, so a new rule is only added once.
 */
export function visibleAssignments({
  data,
  allClassInfo,
  hiddenClasses,
  hiddenAssignments,
  filters,
  includeSettled,
}: VisibleAssignmentsParams): VisibleAssignment[] {
  const visible: VisibleAssignment[] = [];
  const hiddenClassIds = new Set(hiddenClasses);
  const hiddenAssignmentIds = new Set(hiddenAssignments);

  for (const [index, query] of data.entries()) {
    const classInfo = allClassInfo[index];
    if (hiddenClassIds.has(classInfo.id) || !query?.length) {
      continue;
    }

    for (const assignment of query) {
      if (hiddenAssignmentIds.has(assignment.id)) {
        continue;
      }
      if (!(includeSettled || !isSettled(assignment))) {
        continue;
      }
      if (!passesFilters(assignment, filters)) {
        continue;
      }
      visible.push({ assignment, classInfo });
    }
  }

  return visible;
}
