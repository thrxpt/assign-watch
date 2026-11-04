import { format, isSameDay, parse } from "date-fns";

import type { SortState } from "@/lib/preferences";
import type { VisibleAssignment } from "@/lib/visible-assignments";
import type { Activity, ClassInfo } from "@/types";

export interface ClassGroup {
  assignments: Activity[];
  classInfo: ClassInfo;
}

export interface DateGroupEntry {
  assignments: Activity[];
  date: string | null;
}

export interface DayEntry {
  assignments: Activity[];
  day: Date;
}

export function sortAssignments(assignments: Activity[], sortState: SortState) {
  const field = sortState.sortBy === "postedDate" ? "start_date" : "due_date";
  return assignments.toSorted((a, b) => {
    const dateA = a[field];
    const dateB = b[field];
    if (!dateA) {
      return dateB ? 1 : 0;
    }
    if (!dateB) {
      return -1;
    }
    const comparison = new Date(dateA).getTime() - new Date(dateB).getTime();
    return sortState.direction === "asc" ? comparison : -comparison;
  });
}

export function groupByClass(
  items: VisibleAssignment[],
  sortState: SortState
): ClassGroup[] {
  const groups = new Map<number, ClassGroup>();

  for (const { assignment, classInfo } of items) {
    let group = groups.get(classInfo.id);
    if (!group) {
      group = { assignments: [], classInfo };
      groups.set(classInfo.id, group);
    }
    group.assignments.push(assignment);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    assignments: sortAssignments(group.assignments, sortState),
  }));
}

export function groupByDueDate(
  items: VisibleAssignment[],
  sortState: SortState
): DateGroupEntry[] {
  const sorted = sortAssignments(
    items.map((item) => item.assignment),
    sortState
  );

  const groups = new Map<string | null, Activity[]>();
  for (const assignment of sorted) {
    const dateKey = assignment.due_date
      ? format(new Date(assignment.due_date), "yyyy-MM-dd")
      : null;
    const bucket = groups.get(dateKey);
    if (bucket) {
      bucket.push(assignment);
    } else {
      groups.set(dateKey, [assignment]);
    }
  }

  return [...groups.entries()]
    .toSorted(([a], [b]) => {
      if (a === null) {
        return b === null ? 0 : 1;
      }
      if (b === null) {
        return -1;
      }
      const comparison =
        parse(a, "yyyy-MM-dd", new Date()).getTime() -
        parse(b, "yyyy-MM-dd", new Date()).getTime();
      return sortState.direction === "asc" ? comparison : -comparison;
    })
    .map(([date, assignments]) => ({ assignments, date }));
}

export function groupByDay(
  items: VisibleAssignment[],
  days: Date[]
): DayEntry[] {
  const buckets = new Map<number, Activity[]>(days.map((day) => [+day, []]));

  for (const { assignment } of items) {
    if (!assignment.due_date) {
      continue;
    }
    const dueDate = new Date(assignment.due_date);
    const day = days.find((candidate) => isSameDay(dueDate, candidate));
    if (day) {
      buckets.get(+day)?.push(assignment);
    }
  }

  return days.map((day) => ({ assignments: buckets.get(+day) ?? [], day }));
}
