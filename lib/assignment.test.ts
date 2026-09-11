import { describe, expect, it } from "vitest";

import {
  getAssignmentUrl,
  getRelativeStatusColor,
  getStatusBarColor,
  getStatusCalendarColor,
  getSubmissionStatus,
  isSubmitted,
} from "@/lib/assignment";
import type { Activity } from "@/types";

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
    class_id: 101,
    class_user_id: 1,
    count_group_member: 1,
    created_at: "2026-09-01T00:00:00Z",
    description: "Test description",
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
    title: "Test Activity",
    type: "ASM",
    user: 1,
    user_id: 1,
    ...overrides,
  };
}

describe("assignment logic", () => {
  describe("getSubmissionStatus", () => {
    it("returns submitted when submitted on time", () => {
      const assignment = createMockActivity({
        activity_submission_id: 10,
        activity_submission_is_late: false,
        quiz_submission_is_submitted: 1,
      });
      expect(getSubmissionStatus(assignment)).toBe("submitted");
    });

    it("returns submitted_late when activity_submission_is_late is true", () => {
      const assignment = createMockActivity({
        activity_submission_id: 11,
        activity_submission_is_late: true,
      });
      expect(getSubmissionStatus(assignment)).toBe("submitted_late");
    });

    it("returns quiz_not_submitted when submission exists but quiz_submission_is_submitted is 0", () => {
      const assignment = createMockActivity({
        activity_submission_id: 12,
        activity_submission_is_late: false,
        quiz_submission_is_submitted: 0,
        type: "QUZ",
      });
      expect(getSubmissionStatus(assignment)).toBe("quiz_not_submitted");
    });

    it("returns not_submitted when not submitted and due date has passed", () => {
      const assignment = createMockActivity({
        activity_submission_id: 0,
        due_date_exceed: true,
      });
      expect(getSubmissionStatus(assignment)).toBe("not_submitted");
    });

    it("returns in_progress when not submitted and due date has not passed", () => {
      const assignment = createMockActivity({
        activity_submission_id: 0,
        due_date_exceed: false,
      });
      expect(getSubmissionStatus(assignment)).toBe("in_progress");
    });
  });

  describe("isSubmitted", () => {
    it("returns true for submitted and submitted_late", () => {
      const submitted = createMockActivity({
        activity_submission_id: 20,
        activity_submission_is_late: false,
      });
      const submittedLate = createMockActivity({
        activity_submission_id: 21,
        activity_submission_is_late: true,
      });

      expect(isSubmitted(submitted)).toBe(true);
      expect(isSubmitted(submittedLate)).toBe(true);
    });

    it("returns false for in_progress, not_submitted, and quiz_not_submitted", () => {
      const inProgress = createMockActivity({
        activity_submission_id: 0,
        due_date_exceed: false,
      });
      const notSubmitted = createMockActivity({
        activity_submission_id: 0,
        due_date_exceed: true,
      });
      const quizNotSubmitted = createMockActivity({
        activity_submission_id: 22,
        quiz_submission_is_submitted: 0,
      });

      expect(isSubmitted(inProgress)).toBe(false);
      expect(isSubmitted(notSubmitted)).toBe(false);
      expect(isSubmitted(quizNotSubmitted)).toBe(false);
    });
  });

  describe("getAssignmentUrl", () => {
    it("generates activity url for ASM type", () => {
      const url = getAssignmentUrl({
        class_id: 42,
        id: 100,
        type: "ASM",
      });
      expect(url).toBe("https://app.leb2.org/class/42/activity/100");
    });

    it("generates quiz url for QUZ type", () => {
      const url = getAssignmentUrl({
        class_id: 42,
        id: 200,
        type: "QUZ",
      });
      expect(url).toBe("https://app.leb2.org/class/42/quiz/200");
    });
  });

  describe("getStatusBarColor", () => {
    it("returns correct accent colors for list view", () => {
      expect(
        getStatusBarColor(
          createMockActivity({
            activity_submission_id: 0,
            due_date_exceed: false,
          })
        )
      ).toBe("after:bg-neutral-500/70");

      expect(
        getStatusBarColor(
          createMockActivity({
            activity_submission_id: 0,
            due_date_exceed: true,
          })
        )
      ).toBe("after:bg-red-500/70");

      expect(
        getStatusBarColor(
          createMockActivity({
            activity_submission_id: 30,
            quiz_submission_is_submitted: 0,
          })
        )
      ).toBe("after:bg-amber-500/70");

      expect(
        getStatusBarColor(
          createMockActivity({
            activity_submission_id: 31,
            activity_submission_is_late: false,
            quiz_submission_is_submitted: 1,
          })
        )
      ).toBe("after:bg-green-500/70");

      expect(
        getStatusBarColor(
          createMockActivity({
            activity_submission_id: 32,
            activity_submission_is_late: true,
          })
        )
      ).toBeUndefined();
    });
  });

  describe("getStatusCalendarColor", () => {
    it("returns correct chip styling for calendar view", () => {
      expect(
        getStatusCalendarColor(
          createMockActivity({
            activity_submission_id: 0,
            due_date_exceed: false,
          })
        )
      ).toBe(
        "border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 [&>div:first-child]:text-neutral-700 [&>div:last-child]:text-neutral-700/80"
      );

      expect(
        getStatusCalendarColor(
          createMockActivity({
            activity_submission_id: 0,
            due_date_exceed: true,
          })
        )
      ).toBe(
        "border-red-200 bg-red-100 text-red-700 hover:bg-red-200 [&>div:first-child]:text-red-700 [&>div:last-child]:text-red-700/80"
      );

      expect(
        getStatusCalendarColor(
          createMockActivity({
            activity_submission_id: 40,
            quiz_submission_is_submitted: 0,
          })
        )
      ).toBe(
        "border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200 [&>div:first-child]:text-amber-700 [&>div:last-child]:text-amber-700/80"
      );

      expect(
        getStatusCalendarColor(
          createMockActivity({
            activity_submission_id: 41,
            activity_submission_is_late: false,
            quiz_submission_is_submitted: 1,
          })
        )
      ).toBe(
        "border-green-200 bg-green-100 text-green-700 hover:bg-green-200 [&>div:first-child]:text-green-700 [&>div:last-child]:text-green-700/80"
      );

      expect(
        getStatusCalendarColor(
          createMockActivity({
            activity_submission_id: 42,
            activity_submission_is_late: true,
          })
        )
      ).toBe(
        "border-orange-200 bg-orange-100 text-orange-700 hover:bg-orange-200 [&>div:first-child]:text-orange-700 [&>div:last-child]:text-orange-700/80"
      );
    });
  });

  describe("getRelativeStatusColor", () => {
    it("returns correct color classes for relative due date badges", () => {
      expect(getRelativeStatusColor("late")).toBe("text-red-600");
      expect(getRelativeStatusColor("today")).toBe("text-yellow-600");
      expect(getRelativeStatusColor("upcoming")).toBe("text-green-600");
    });
  });
});
