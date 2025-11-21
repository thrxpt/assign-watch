import { useState } from "react";
import { Activity, ClassInfo } from "@/types";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfWeek,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, EyeOff } from "lucide-react";

import { cn, getSubmissionStatus, hideAssignment } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface CalendarViewProps {
  allClassInfo: ClassInfo[];
  allAssignments: (Activity[] | undefined)[];
  hiddenAssignments: number[];
  applyFilters: (assignment: Activity) => boolean;
}

export function CalendarView({
  allClassInfo,
  allAssignments,
  hiddenAssignments,
  applyFilters,
}: CalendarViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const now = new Date();
  const currentWeek = addWeeks(now, weekOffset);
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 }); // Saturday
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get all assignments for this week
  const thisWeekAssignments = allAssignments
    .flat()
    .filter((assignment): assignment is Activity => {
      if (!assignment) return false;
      if (hiddenAssignments.includes(assignment.id)) return false;
      if (!applyFilters(assignment)) return false;

      const dueDate = new Date(assignment.due_date);
      return dueDate >= weekStart && dueDate <= weekEnd;
    });

  // Group assignments by day
  const assignmentsByDay = daysInWeek.map((day) => ({
    day,
    assignments: thisWeekAssignments.filter((assignment) =>
      isSameDay(new Date(assignment.due_date), day),
    ),
  }));

  const getAssignmentStatusColor = (assignment: Activity) => {
    if (getSubmissionStatus(assignment) === "submitted") {
      return cn(
        "border-green-200 bg-green-100 hover:bg-green-200 [&>div:first-child]:text-green-700 [&>div:last-child]:text-green-700/80",
      );
    } else if (getSubmissionStatus(assignment) === "submitted_late") {
      return cn(
        "border-orange-200 bg-orange-100 hover:bg-orange-200 [&>div:first-child]:text-orange-700 [&>div:last-child]:text-orange-700/80",
      );
    } else if (getSubmissionStatus(assignment) === "not_submitted") {
      return cn(
        "border-red-200 bg-red-100 hover:bg-red-200 [&>div:first-child]:text-red-700 [&>div:last-child]:text-red-700/80",
      );
    } else if (getSubmissionStatus(assignment) === "in_progress") {
      return cn(
        "border-blue-200 bg-blue-100 hover:bg-blue-200 [&>div:first-child]:text-blue-700 [&>div:last-child]:text-blue-700/80",
      );
    }
  };

  const getClassInfo = (classId: number) => {
    return allClassInfo.find((c) => c.id === classId);
  };

  const goToPreviousWeek = () => {
    setWeekOffset((prev) => prev - 1);
  };

  const goToNextWeek = () => {
    setWeekOffset((prev) => prev + 1);
  };

  const goToCurrentWeek = () => {
    setWeekOffset(0);
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-center">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft />
          <span className="sr-only">สัปดาห์ก่อนหน้า</span>
        </Button>
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => weekOffset !== 0 && goToCurrentWeek()}
            title={weekOffset !== 0 ? "ไปยังสัปดาห์ปัจจุบัน" : undefined}
          >
            {format(weekStart, "MMM d", { locale: th })} -{" "}
            {format(weekEnd, "MMM d, yyyy", { locale: th })}
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
          <ChevronRight />
          <span className="sr-only">สัปดาห์ถัดไป</span>
        </Button>
      </div>
      <div className="grid flex-1 grid-cols-7 rounded-lg border">
        {assignmentsByDay.map(({ day, assignments }) => (
          <div
            key={day.toISOString()}
            className={cn("px-1 py-3 not-last:border-r")}
          >
            <div className="mb-3 text-center">
              <div
                className={cn(
                  "text-muted-foreground text-xs font-medium uppercase",
                  isToday(day) && "text-blue-500",
                )}
              >
                {format(day, "EEE", { locale: th })}
              </div>
              <div
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-full text-xl tabular-nums",
                  isToday(day) && "bg-blue-500 text-white",
                )}
              >
                {format(day, "d", { locale: th })}
              </div>
            </div>
            <div className="space-y-1">
              {assignments.map((assignment) => {
                const classInfo = getClassInfo(assignment.class_id);
                return (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <a
                        key={assignment.id}
                        className={cn(
                          "block rounded-sm border p-2 text-xs transition-colors",
                          getAssignmentStatusColor(assignment),
                        )}
                        title={assignment.title + " - " + classInfo?.title}
                        href={`https://app.leb2.org/class/${assignment.class_id}/${
                          assignment.type === "ASM" ? "activity" : "quiz"
                        }/${assignment.id}`}
                      >
                        <div className="truncate font-medium">
                          {assignment.title}
                        </div>
                        <div>
                          {format(new Date(assignment.due_date), "p", {
                            locale: th,
                          })}
                        </div>
                      </a>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onSelect={() => hideAssignment(assignment.id)}
                      >
                        <EyeOff />
                        ซ่อนงานนี้
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
