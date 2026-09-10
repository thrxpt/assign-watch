import { storage } from "wxt/utils/storage";

import {
  DEFAULT_FILTERS,
  DEFAULT_GROUP,
  DEFAULT_LANGUAGE,
  DEFAULT_SHOW_CALENDAR_BY,
  DEFAULT_SORT,
  DEFAULT_TIME_FORMAT,
} from "@/lib/preferences";
import type {
  FilterState,
  GroupState,
  Language,
  ShowCalendarBy,
  SortState,
  TimeFormat,
} from "@/lib/preferences";
import type { ClassInfo } from "@/types";

export const hiddenClassesStorage = storage.defineItem<number[]>(
  "local:hiddenClasses",
  {
    fallback: [],
  }
);

export const hiddenAssignmentsStorage = storage.defineItem<number[]>(
  "local:hiddenAssignments",
  {
    fallback: [],
  }
);

export const filtersStorage = storage.defineItem<FilterState>(
  "local:assignmentFilters",
  {
    fallback: DEFAULT_FILTERS,
  }
);

export const sortStorage = storage.defineItem<SortState>(
  "local:assignmentSort",
  {
    fallback: DEFAULT_SORT,
  }
);

export const groupStorage = storage.defineItem<GroupState>(
  "local:assignmentGroup",
  {
    fallback: DEFAULT_GROUP,
  }
);

export const showCalendarByStorage = storage.defineItem<ShowCalendarBy>(
  "local:showCalendarBy",
  {
    fallback: DEFAULT_SHOW_CALENDAR_BY,
  }
);

export const languageStorage = storage.defineItem<Language>("local:language", {
  fallback: DEFAULT_LANGUAGE,
});

export const timeFormatStorage = storage.defineItem<TimeFormat>(
  "local:timeFormat",
  {
    fallback: DEFAULT_TIME_FORMAT,
  }
);

export const userIdStorage = storage.defineItem<string | null>("local:userId", {
  fallback: null,
});

export const classInfoStorage = storage.defineItem<ClassInfo[]>(
  "local:classInfo",
  {
    fallback: [],
  }
);

export const notifiedAssignmentsStorage = storage.defineItem<number[]>(
  "local:notifiedAssignments",
  {
    fallback: [],
  }
);

export const notifiedAssignments1hStorage = storage.defineItem<number[]>(
  "local:notifiedAssignments1h",
  {
    fallback: [],
  }
);

export async function getHiddenClasses() {
  return (await hiddenClassesStorage.getValue()) ?? [];
}

export async function getHiddenAssignments() {
  return (await hiddenAssignmentsStorage.getValue()) ?? [];
}

export async function hideClass(classId: number) {
  const hidden = await getHiddenClasses();
  if (!hidden.includes(classId)) {
    await hiddenClassesStorage.setValue([...hidden, classId]);
  }
}

export async function hideAssignment(assignmentId: number) {
  const hidden = await getHiddenAssignments();
  if (!hidden.includes(assignmentId)) {
    await hiddenAssignmentsStorage.setValue([...hidden, assignmentId]);
  }
}

export async function isClassHidden(classId: number) {
  const hidden = await getHiddenClasses();
  return hidden.includes(classId);
}

export async function isAssignmentHidden(
  assignmentId: number
): Promise<boolean> {
  const hidden = await getHiddenAssignments();
  return hidden.includes(assignmentId);
}

export async function unhideClass(classId: number) {
  const hidden = await getHiddenClasses();
  await hiddenClassesStorage.setValue(hidden.filter((id) => id !== classId));
}

export async function unhideAssignment(assignmentId: number) {
  const hidden = await getHiddenAssignments();
  await hiddenAssignmentsStorage.setValue(
    hidden.filter((id) => id !== assignmentId)
  );
}

export async function clearAllHiddenItems() {
  await hiddenClassesStorage.setValue([]);
  await hiddenAssignmentsStorage.setValue([]);
}
