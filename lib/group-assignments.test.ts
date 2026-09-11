import { describe, expect, it } from "vitest";

import {
  groupByClass,
  groupByDay,
  groupByDueDate,
  sortAssignments,
} from "@/lib/group-assignments";
import type { SortState } from "@/lib/preferences";
import type { VisibleAssignment } from "@/lib/visible-assignments";
import type { Activity, ClassInfo } from "@/types";

function createMockClass(overrides: Partial<ClassInfo> = {}): ClassInfo {
  return {
    description: "Sample Description",
    id: 1,
    section: "1",
    semester: "1/2026",
    title: "Intro to CS",
    ...overrides,
  };
}

function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    activity_group_id: null,
    activity_group_name: null,
    activity_submission_id: 0,
    activity_submission_is_late: false,
    activity_submission_submitted_at: {
      date: "2026-09-11 10:00:00.000000",
      timezone: "Asia/Bangkok",
      timezone_type: 3,
    },
    adv_starred: 0,
    class_id: 1,
    class_user_id: 1,
    count_group_member: 1,
    created_at: "2026-09-01T00:00:00Z",
    description: "Sample Activity",
    due_date: "2026-09-15T23:59:59Z",
    due_date_exceed: false,
    edit_group_mode: "none",
    fileactivities: [],
    group_type: "IND",
    id: 1,
    is_allow_repeat: 0,
    peer_assessment: 0,
    questions: [],
    quiz_submission_is_submitted: 1,
    start_date: "2026-09-01T00:00:00Z",
    title: "Activity Title",
    type: "ASM",
    user: 1,
    user_id: 1,
    ...overrides,
  };
}

describe("group-assignments logic", () => {
  describe("sortAssignments", () => {
    const itemA = createMockActivity({
      due_date: "2026-09-10T12:00:00Z",
      id: 1,
      start_date: "2026-09-03T12:00:00Z",
    });
    const itemB = createMockActivity({
      due_date: "2026-09-20T12:00:00Z",
      id: 2,
      start_date: "2026-09-01T12:00:00Z",
    });
    const itemC = createMockActivity({
      due_date: "2026-09-15T12:00:00Z",
      id: 3,
      start_date: "2026-09-05T12:00:00Z",
    });

    it("sorts ascending by dueDate", () => {
      const sortState: SortState = { direction: "asc", sortBy: "dueDate" };
      const result = sortAssignments([itemB, itemA, itemC], sortState);
      expect(result.map((item) => item.id)).toEqual([1, 3, 2]);
    });

    it("sorts descending by dueDate", () => {
      const sortState: SortState = { direction: "desc", sortBy: "dueDate" };
      const result = sortAssignments([itemA, itemB, itemC], sortState);
      expect(result.map((item) => item.id)).toEqual([2, 3, 1]);
    });

    it("sorts ascending by postedDate (start_date)", () => {
      const sortState: SortState = { direction: "asc", sortBy: "postedDate" };
      const result = sortAssignments([itemA, itemB, itemC], sortState);
      expect(result.map((item) => item.id)).toEqual([2, 1, 3]);
    });

    it("sorts descending by postedDate (start_date)", () => {
      const sortState: SortState = { direction: "desc", sortBy: "postedDate" };
      const result = sortAssignments([itemA, itemB, itemC], sortState);
      expect(result.map((item) => item.id)).toEqual([3, 1, 2]);
    });
  });

  describe("groupByClass", () => {
    const class1 = createMockClass({ id: 1, title: "Biology" });
    const class2 = createMockClass({ id: 2, title: "Physics" });

    const item1 = createMockActivity({
      class_id: 1,
      due_date: "2026-09-20T00:00:00Z",
      id: 101,
    });
    const item2 = createMockActivity({
      class_id: 1,
      due_date: "2026-09-10T00:00:00Z",
      id: 102,
    });
    const item3 = createMockActivity({
      class_id: 2,
      due_date: "2026-09-15T00:00:00Z",
      id: 201,
    });

    const visibleItems: VisibleAssignment[] = [
      { assignment: item1, classInfo: class1 },
      { assignment: item2, classInfo: class1 },
      { assignment: item3, classInfo: class2 },
    ];

    it("groups assignments by class and sorts each group", () => {
      const sortState: SortState = { direction: "asc", sortBy: "dueDate" };
      const groups = groupByClass(visibleItems, sortState);

      expect(groups).toHaveLength(2);
      expect(groups[0].classInfo.id).toBe(1);
      expect(groups[0].assignments.map((item) => item.id)).toEqual([102, 101]);

      expect(groups[1].classInfo.id).toBe(2);
      expect(groups[1].assignments.map((item) => item.id)).toEqual([201]);
    });

    it("returns empty array for empty items", () => {
      const sortState: SortState = { direction: "asc", sortBy: "dueDate" };
      expect(groupByClass([], sortState)).toEqual([]);
    });
  });

  describe("groupByDueDate", () => {
    const classInfo = createMockClass();
    const item1 = createMockActivity({
      due_date: "2026-09-15T09:00:00.000Z",
      id: 1,
    });
    const item2 = createMockActivity({
      due_date: "2026-09-15T18:00:00.000Z",
      id: 2,
    });
    const item3 = createMockActivity({
      due_date: "2026-09-10T12:00:00.000Z",
      id: 3,
    });

    const visibleItems: VisibleAssignment[] = [
      { assignment: item1, classInfo },
      { assignment: item2, classInfo },
      { assignment: item3, classInfo },
    ];

    it("groups assignments by date and sorts date buckets ascending", () => {
      const sortState: SortState = { direction: "asc", sortBy: "dueDate" };
      const groups = groupByDueDate(visibleItems, sortState);

      expect(groups).toHaveLength(2);
      expect(groups[0].date).toBe("2026-09-10");
      expect(groups[0].assignments.map((item) => item.id)).toEqual([3]);

      expect(groups[1].date).toBe("2026-09-15");
      expect(groups[1].assignments.map((item) => item.id)).toEqual([1, 2]);
    });

    it("sorts date buckets descending when direction is desc", () => {
      const sortState: SortState = { direction: "desc", sortBy: "dueDate" };
      const groups = groupByDueDate(visibleItems, sortState);

      expect(groups).toHaveLength(2);
      expect(groups[0].date).toBe("2026-09-15");
      expect(groups[1].date).toBe("2026-09-10");
    });
  });

  describe("groupByDay", () => {
    const classInfo = createMockClass();
    const day1 = new Date("2026-09-10T00:00:00");
    const day2 = new Date("2026-09-11T00:00:00");
    const day3 = new Date("2026-09-12T00:00:00");

    const item1 = createMockActivity({
      due_date: day1.toISOString(),
      id: 1,
    });
    const item2 = createMockActivity({
      due_date: day1.toISOString(),
      id: 2,
    });
    const item3 = createMockActivity({
      due_date: day3.toISOString(),
      id: 3,
    });
    const itemOutside = createMockActivity({
      due_date: new Date("2026-09-25T00:00:00").toISOString(),
      id: 99,
    });

    const visibleItems: VisibleAssignment[] = [
      { assignment: item1, classInfo },
      { assignment: item2, classInfo },
      { assignment: item3, classInfo },
      { assignment: itemOutside, classInfo },
    ];

    it("distributes assignments into matching date buckets using isSameDay", () => {
      const result = groupByDay(visibleItems, [day1, day2, day3]);

      expect(result).toHaveLength(3);
      expect(result[0].day).toBe(day1);
      expect(result[0].assignments.map((item) => item.id)).toEqual([1, 2]);

      expect(result[1].day).toBe(day2);
      expect(result[1].assignments).toEqual([]);

      expect(result[2].day).toBe(day3);
      expect(result[2].assignments.map((item) => item.id)).toEqual([3]);
    });
  });
});
