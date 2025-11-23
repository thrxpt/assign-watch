import { Activity, RootResponse } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import moment from "moment/min/moment-with-locales";
import { twMerge } from "tailwind-merge";

import { FilterState } from "@/components/assignment-filters";
import { SortState } from "@/components/assignment-sort";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateRelative(date: Date) {
  moment.locale("th");
  return {
    text: moment(date).fromNow(),
    status: moment(date).isBefore(moment())
      ? "late"
      : moment(date).isSame(new Date(), "day")
        ? "today"
        : "upcoming",
  };
}

export function formatDate(date: Date) {
  return format(date, "eeee, d MMM yyyy ⋅ p", { locale: th });
}

export function getUserId() {
  const userId = document
    .querySelector("[data-userid]")
    ?.getAttribute("data-userid");
  return userId;
}

export function getAllClassInfo() {
  const classCards = document.querySelectorAll(".class-card");
  const classTextElements = document.querySelectorAll(
    "#font-color-main-card p",
  );
  const classesInfo = [];

  for (let i = 0; i < classCards.length; i++) {
    const cardName = classCards[i].getAttribute("name");
    const classId = cardName?.split("-")[1];
    if (!classId) continue;
    const classTitle = classTextElements[i * 2].textContent;
    const classDescription = classTextElements[i * 2 + 1].textContent;

    classesInfo.push({
      id: Number(classId),
      title: classTitle,
      description: classDescription,
    });
  }
  return classesInfo;
}

export async function getAssignments(classId: number) {
  const userId = getUserId();
  const res = await fetch(
    `https://app.leb2.org/api/get/assessment-activities/student?class_id=${classId}&student_id=${userId}&filter_groups[0][filters][0][key]=class_id&filter_groups[0][filters][0][value]=${classId}&sort[]=sequence&sort[]=id&select[]=activities:id,user_id,class_id,adv_starred,group_type,type,peer_assessment,is_allow_repeat,title,description,start_date,due_date,edit_group_mode,created_at&select[]=user:id,firstname_en,lastname_en,firstname_th,lastname_th&includes[]=user:sideload&includes[]=fileactivities:ids&includes[]=questions:ids`,
  );
  const data = (await res.json()) as RootResponse;
  return data.activities.filter((activity) => activity.due_date !== null);
}

export function getSubmissionStatus(assignment: Activity) {
  if (assignment.activity_submission_id) {
    if (assignment.activity_submission_is_late) {
      return "submitted_late";
    } else if (assignment.quiz_submission_is_submitted === 0) {
      return "quiz_not_submitted";
    } else {
      return "submitted";
    }
  } else {
    if (assignment.due_date_exceed) {
      return "not_submitted";
    } else {
      return "in_progress";
    }
  }
}

export const hiddenClassesStorage = storage.defineItem<number[]>(
  "local:hiddenClasses",
  {
    fallback: [],
  },
);

export const hiddenAssignmentsStorage = storage.defineItem<number[]>(
  "local:hiddenAssignments",
  {
    fallback: [],
  },
);

export const filtersStorage = storage.defineItem<FilterState>(
  "local:assignmentFilters",
  {
    fallback: {
      submissionStatus: {
        submitted: true,
        notSubmitted: true,
      },
      assignmentType: {
        assignment: true,
        quiz: true,
      },
      groupType: {
        individual: true,
        group: true,
      },
    },
  },
);

export const sortStorage = storage.defineItem<SortState>(
  "local:assignmentSort",
  {
    fallback: {
      sortBy: "dueDate",
      direction: "asc",
    },
  },
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
  assignmentId: number,
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
    hidden.filter((id) => id !== assignmentId),
  );
}

export async function clearAllHiddenItems() {
  await hiddenClassesStorage.setValue([]);
  await hiddenAssignmentsStorage.setValue([]);
}
