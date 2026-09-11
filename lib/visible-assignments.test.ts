import { describe, expect, it } from "vitest";

import { DEFAULT_FILTERS } from "@/lib/preferences";
import type { FilterState } from "@/lib/preferences";
import {
  isSettled,
  passesFilters,
  visibleAssignments,
} from "@/lib/visible-assignments";
import type { Activity, ClassInfo } from "@/types";

function createMockClass(overrides: Partial<ClassInfo> = {}): ClassInfo {
  return {
    description: "Sample Class Description",
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
    description: "Assignment description",
    due_date: "2026-09-15T23:59:59Z",
    due_date_exceed: false,
    edit_group_mode: "none",
    fileactivities: [],
    group_type: "IND",
    id: 101,
    is_allow_repeat: 0,
    peer_assessment: 0,
    questions: [],
    quiz_submission_is_submitted: 1,
    start_date: "2026-09-01T00:00:00Z",
    title: "Homework 1",
    type: "ASM",
    user: 1,
    user_id: 1,
    ...overrides,
  };
}

describe("visible-assignments logic", () => {
  describe("passesFilters", () => {
    it("filters out assignments by assignmentType", () => {
      const asm = createMockActivity({ type: "ASM" });
      const quz = createMockActivity({ type: "QUZ" });

      const filterNoAsm: FilterState = {
        ...DEFAULT_FILTERS,
        assignmentType: { assignment: false, quiz: true },
      };
      const filterNoQuiz: FilterState = {
        ...DEFAULT_FILTERS,
        assignmentType: { assignment: true, quiz: false },
      };

      expect(passesFilters(asm, DEFAULT_FILTERS)).toBe(true);
      expect(passesFilters(quz, DEFAULT_FILTERS)).toBe(true);

      expect(passesFilters(asm, filterNoAsm)).toBe(false);
      expect(passesFilters(quz, filterNoAsm)).toBe(true);

      expect(passesFilters(asm, filterNoQuiz)).toBe(true);
      expect(passesFilters(quz, filterNoQuiz)).toBe(false);
    });

    it("filters out assignments by groupType", () => {
      const individual = createMockActivity({ group_type: "IND" });
      const group = createMockActivity({ group_type: "STU" });

      const filterNoInd: FilterState = {
        ...DEFAULT_FILTERS,
        groupType: { group: true, individual: false },
      };
      const filterNoGrp: FilterState = {
        ...DEFAULT_FILTERS,
        groupType: { group: false, individual: true },
      };

      expect(passesFilters(individual, filterNoInd)).toBe(false);
      expect(passesFilters(group, filterNoInd)).toBe(true);

      expect(passesFilters(individual, filterNoGrp)).toBe(true);
      expect(passesFilters(group, filterNoGrp)).toBe(false);
    });

    it("filters out assignments by submissionStatus", () => {
      const submitted = createMockActivity({ activity_submission_id: 10 });
      const notSubmitted = createMockActivity({ activity_submission_id: 0 });

      const filterNoSubmitted: FilterState = {
        ...DEFAULT_FILTERS,
        submissionStatus: { notSubmitted: true, submitted: false },
      };
      const filterNoNotSubmitted: FilterState = {
        ...DEFAULT_FILTERS,
        submissionStatus: { notSubmitted: false, submitted: true },
      };

      expect(passesFilters(submitted, filterNoSubmitted)).toBe(false);
      expect(passesFilters(notSubmitted, filterNoSubmitted)).toBe(true);

      expect(passesFilters(submitted, filterNoNotSubmitted)).toBe(true);
      expect(passesFilters(notSubmitted, filterNoNotSubmitted)).toBe(false);
    });
  });

  describe("isSettled", () => {
    it("returns true when assignment is submitted and due date has passed", () => {
      const settled = createMockActivity({
        activity_submission_id: 10,
        due_date_exceed: true,
      });
      expect(isSettled(settled)).toBe(true);
    });

    it("returns false when assignment is submitted but due date has not passed", () => {
      const notSettledYet = createMockActivity({
        activity_submission_id: 10,
        due_date_exceed: false,
      });
      expect(isSettled(notSettledYet)).toBe(false);
    });

    it("returns false when due date has passed but assignment is not submitted", () => {
      const expiredNotSubmitted = createMockActivity({
        activity_submission_id: 0,
        due_date_exceed: true,
      });
      expect(isSettled(expiredNotSubmitted)).toBe(false);
    });
  });

  describe("visibleAssignments", () => {
    const class1 = createMockClass({ id: 1, title: "Class 1" });
    const class2 = createMockClass({ id: 2, title: "Class 2" });

    const assignment1 = createMockActivity({
      class_id: 1,
      id: 101,
      title: "Task 1",
    });
    const assignment2 = createMockActivity({
      class_id: 2,
      id: 201,
      title: "Task 2",
    });

    it("omits assignments from hidden classes", () => {
      const result = visibleAssignments({
        allClassInfo: [class1, class2],
        data: [[assignment1], [assignment2]],
        filters: DEFAULT_FILTERS,
        hiddenAssignments: [],
        hiddenClasses: [1],
        includeSettled: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].assignment.id).toBe(201);
      expect(result[0].classInfo.id).toBe(2);
    });

    it("omits explicitly hidden assignments", () => {
      const result = visibleAssignments({
        allClassInfo: [class1, class2],
        data: [[assignment1], [assignment2]],
        filters: DEFAULT_FILTERS,
        hiddenAssignments: [101],
        hiddenClasses: [],
        includeSettled: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].assignment.id).toBe(201);
    });

    it("omits settled assignments in list view (includeSettled = false)", () => {
      const settled = createMockActivity({
        activity_submission_id: 50,
        due_date_exceed: true,
        id: 301,
      });
      const unsubmitted = createMockActivity({
        activity_submission_id: 0,
        due_date_exceed: false,
        id: 302,
      });

      const result = visibleAssignments({
        allClassInfo: [class1],
        data: [[settled, unsubmitted]],
        filters: DEFAULT_FILTERS,
        hiddenAssignments: [],
        hiddenClasses: [],
        includeSettled: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].assignment.id).toBe(302);
    });

    it("retains settled assignments in calendar view (includeSettled = true)", () => {
      const settled = createMockActivity({
        activity_submission_id: 50,
        due_date_exceed: true,
        id: 301,
      });
      const unsubmitted = createMockActivity({
        activity_submission_id: 0,
        due_date_exceed: false,
        id: 302,
      });

      const result = visibleAssignments({
        allClassInfo: [class1],
        data: [[settled, unsubmitted]],
        filters: DEFAULT_FILTERS,
        hiddenAssignments: [],
        hiddenClasses: [],
        includeSettled: true,
      });

      expect(result).toHaveLength(2);
      expect(result.map((item) => item.assignment.id)).toEqual([301, 302]);
    });

    it("handles undefined or empty query data gracefully", () => {
      const result = visibleAssignments({
        allClassInfo: [class1, class2],
        data: [undefined, []],
        filters: DEFAULT_FILTERS,
        hiddenAssignments: [],
        hiddenClasses: [],
        includeSettled: true,
      });

      expect(result).toEqual([]);
    });

    it("applies filter state to omit non-matching assignments", () => {
      const quiz = createMockActivity({ id: 401, type: "QUZ" });
      const asm = createMockActivity({ id: 402, type: "ASM" });

      const filterOnlyQuiz: FilterState = {
        ...DEFAULT_FILTERS,
        assignmentType: { assignment: false, quiz: true },
      };

      const result = visibleAssignments({
        allClassInfo: [class1],
        data: [[quiz, asm]],
        filters: filterOnlyQuiz,
        hiddenAssignments: [],
        hiddenClasses: [],
        includeSettled: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].assignment.id).toBe(401);
    });
  });
});
