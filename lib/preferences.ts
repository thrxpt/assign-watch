/**
 * Owned here rather than by the menus that edit them, so that `lib/` never has
 * to import from `components/`.
 */

export interface FilterState {
  assignmentType: {
    assignment: boolean;
    quiz: boolean;
  };
  groupType: {
    individual: boolean;
    group: boolean;
  };
  submissionStatus: {
    submitted: boolean;
    notSubmitted: boolean;
  };
}

/** Enforces that a category can never have all of its options unchecked. */
export const FILTER_KEYS: {
  [K in keyof FilterState]: (keyof FilterState[K])[];
} = {
  assignmentType: ["assignment", "quiz"],
  groupType: ["individual", "group"],
  submissionStatus: ["submitted", "notSubmitted"],
};

export const DEFAULT_FILTERS: FilterState = {
  assignmentType: {
    assignment: true,
    quiz: true,
  },
  groupType: {
    group: true,
    individual: true,
  },
  submissionStatus: {
    notSubmitted: true,
    submitted: true,
  },
};

export type SortOption = "postedDate" | "dueDate";

export type SortDirection = "asc" | "desc";

export interface SortState {
  direction: SortDirection;
  sortBy: SortOption;
}

export const DEFAULT_SORT: SortState = {
  direction: "asc",
  sortBy: "dueDate",
};

export type GroupOption = "class" | "dueDate";

export interface GroupState {
  groupBy: GroupOption;
}

export const DEFAULT_GROUP: GroupState = {
  groupBy: "class",
};

export type ShowCalendarBy = "month" | "week";

export const DEFAULT_SHOW_CALENDAR_BY: ShowCalendarBy = "month";

export type Language = "auto" | "en" | "th";

export const DEFAULT_LANGUAGE: Language = "auto";

export type TimeFormat = "12h" | "24h";

export const DEFAULT_TIME_FORMAT: TimeFormat = "12h";
