import { useState } from "react";
import { Activity, ClassInfo } from "@/types";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, EyeOff } from "lucide-react";

import {
  cn,
  formatDate,
  getSubmissionStatus,
  hideAssignment,
  ShowCalendarBy,
  showCalendarByStorage,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [showCalendarBy, setShowCalendarBy] = useState<ShowCalendarBy>("month");

  useEffect(() => {
    const loadStorageData = async () => {
      const storedShowCalendarBy = await showCalendarByStorage.getValue();
      setShowCalendarBy(storedShowCalendarBy);
    };
    loadStorageData();

    const unwatch = showCalendarByStorage.watch((newValue) => {
      setShowCalendarBy(newValue);
    });

    return () => {
      unwatch();
    };
  }, []);

  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();

  // Week view calculations
  const currentWeek = addWeeks(now, weekOffset);
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 }); // Saturday
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Month view calculations
  const currentMonth = addMonths(now, monthOffset);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const daysInMonth = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Get assignments for the current view
  const getAssignmentsForRange = (start: Date, end: Date) => {
    return allAssignments
      .flat()
      .filter((assignment): assignment is Activity => {
        if (!assignment) return false;
        if (hiddenAssignments.includes(assignment.id)) return false;
        if (!applyFilters(assignment)) return false;

        const dueDate = new Date(assignment.due_date);
        return dueDate >= start && dueDate <= end;
      });
  };

  const thisWeekAssignments = getAssignmentsForRange(weekStart, weekEnd);
  const thisMonthAssignments = getAssignmentsForRange(
    calendarStart,
    calendarEnd,
  );

  // Group assignments by day
  const assignmentsByDayWeek = daysInWeek.map((day) => ({
    day,
    assignments: thisWeekAssignments.filter((assignment) =>
      isSameDay(new Date(assignment.due_date), day),
    ),
  }));

  const assignmentsByDayMonth = daysInMonth.map((day) => ({
    day,
    assignments: thisMonthAssignments.filter((assignment) =>
      isSameDay(new Date(assignment.due_date), day),
    ),
  }));

  const getAssignmentStatusColor = (assignment: Activity) => {
    if (getSubmissionStatus(assignment) === "submitted") {
      return cn(
        "border-green-200 bg-green-100 text-green-700 hover:bg-green-200 [&>div:first-child]:text-green-700 [&>div:last-child]:text-green-700/80",
      );
    } else if (getSubmissionStatus(assignment) === "submitted_late") {
      return cn(
        "border-orange-200 bg-orange-100 text-orange-700 hover:bg-orange-200 [&>div:first-child]:text-orange-700 [&>div:last-child]:text-orange-700/80",
      );
    } else if (getSubmissionStatus(assignment) === "not_submitted") {
      return cn(
        "border-red-200 bg-red-100 text-red-700 hover:bg-red-200 [&>div:first-child]:text-red-700 [&>div:last-child]:text-red-700/80",
      );
    } else if (getSubmissionStatus(assignment) === "in_progress") {
      return cn(
        "border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 [&>div:first-child]:text-neutral-700 [&>div:last-child]:text-neutral-700/80",
      );
    } else if (getSubmissionStatus(assignment) === "quiz_not_submitted") {
      return cn(
        "border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200 [&>div:first-child]:text-amber-700 [&>div:last-child]:text-amber-700/80",
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

  const goToPreviousMonth = () => {
    setMonthOffset((prev) => prev - 1);
  };

  const goToNextMonth = () => {
    setMonthOffset((prev) => prev + 1);
  };

  const goToCurrentMonth = () => {
    setMonthOffset(0);
  };

  const renderWeekView = () => (
    <div className="grid h-full flex-1 grid-cols-7 rounded-lg border">
      {assignmentsByDayWeek.map(({ day, assignments }) => (
        <div
          key={day.toISOString()}
          className={cn("px-1 py-3 not-last:border-r")}
        >
          <div className="mb-3 text-center">
            <div
              className={cn(
                "text-xs font-medium text-muted-foreground uppercase",
                isToday(day) && "text-[#17b5be]",
              )}
            >
              {formatDate(day, "EEE")}
            </div>
            <div
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full text-xl tabular-nums",
                isToday(day) && "bg-[#17b5be] text-white",
              )}
            >
              {formatDate(day, "d")}
            </div>
          </div>
          <div className="space-y-1">
            {assignments.map((assignment) => {
              const classInfo = getClassInfo(assignment.class_id);
              return (
                <ContextMenu key={assignment.id}>
                  <ContextMenuTrigger asChild>
                    <a
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
                        {formatDate(new Date(assignment.due_date), "p")}
                      </div>
                    </a>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onSelect={() => hideAssignment(assignment.id)}
                    >
                      <EyeOff />
                      {i18n.t("hide_assignment")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderMonthView = () => {
    const weeks: (typeof assignmentsByDayMonth)[] = [];
    for (let i = 0; i < assignmentsByDayMonth.length; i += 7) {
      weeks.push(assignmentsByDayMonth.slice(i, i + 7));
    }

    const MAX_ASSIGNMENTS = weeks.length > 5 ? 2 : 3;

    return (
      <div className="flex h-full flex-1 flex-col rounded-lg border">
        {/* Day headers */}
        <div className="grid shrink-0 grid-cols-7 border-b bg-muted/30">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
            <div
              key={day}
              className={cn(
                "px-1 py-2 text-center text-xs font-medium text-muted-foreground uppercase",
                idx < 6 && "border-r",
              )}
            >
              {formatDate(daysInWeek[idx], "EEE")}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto">
          <div
            className="grid h-full"
            style={{
              gridTemplateRows: `repeat(${weeks.length}, minmax(80px, 1fr))`,
            }}
          >
            {weeks.map((week, weekIdx) => (
              <div
                key={weekIdx}
                className={cn(
                  "grid min-h-[80px] grid-cols-7",
                  weekIdx < weeks.length - 1 && "border-b",
                )}
              >
                {week.map(({ day, assignments }, dayIdx) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "overflow-hidden p-1",
                      dayIdx < 6 && "border-r",
                      !isSameMonth(day, currentMonth) &&
                        "bg-muted/20 opacity-50",
                    )}
                  >
                    <div className="mb-1 text-center">
                      <span
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                          isToday(day) && "bg-[#17b5be] text-white",
                          !isToday(day) &&
                            !isSameMonth(day, currentMonth) &&
                            "text-muted-foreground",
                        )}
                      >
                        {formatDate(day, "d")}
                      </span>
                    </div>
                    <div className="max-h-[calc(100%-24px)] space-y-0.5 overflow-y-auto">
                      {assignments
                        .slice(0, MAX_ASSIGNMENTS)
                        .map((assignment) => {
                          const classInfo = getClassInfo(assignment.class_id);
                          return (
                            <ContextMenu key={assignment.id}>
                              <ContextMenuTrigger asChild>
                                <a
                                  className={cn(
                                    "block truncate rounded-sm border px-1 py-0.5 text-[10px] transition-colors",
                                    getAssignmentStatusColor(assignment),
                                  )}
                                  title={
                                    assignment.title + " - " + classInfo?.title
                                  }
                                  href={`https://app.leb2.org/class/${assignment.class_id}/${
                                    assignment.type === "ASM"
                                      ? "activity"
                                      : "quiz"
                                  }/${assignment.id}`}
                                >
                                  {assignment.title}
                                </a>
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                <ContextMenuItem
                                  onSelect={() => hideAssignment(assignment.id)}
                                >
                                  <EyeOff />
                                  {i18n.t("hide_assignment")}
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          );
                        })}
                      {assignments.length > MAX_ASSIGNMENTS && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="block cursor-pointer truncate rounded-sm px-1 py-0.5 text-[10px] transition-colors hover:bg-accent hover:text-accent-foreground">
                              +{assignments.length - MAX_ASSIGNMENTS}{" "}
                              {i18n.t("more")}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent
                            side="right"
                            className="w-fit space-y-0.5 p-1"
                          >
                            {assignments.map((assignment) => (
                              <a
                                className={cn(
                                  "block truncate rounded-sm border px-1 py-0.5 text-[10px] transition-colors",
                                  getAssignmentStatusColor(assignment),
                                )}
                                title={
                                  assignment.title +
                                  " - " +
                                  getClassInfo(assignment.class_id)?.title
                                }
                                href={`https://app.leb2.org/class/${assignment.class_id}/${
                                  assignment.type === "ASM"
                                    ? "activity"
                                    : "quiz"
                                }/${assignment.id}`}
                              >
                                {assignment.title}
                              </a>
                            ))}
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Tabs
      value={showCalendarBy}
      onValueChange={(value) =>
        showCalendarByStorage.setValue(value as ShowCalendarBy)
      }
      className="flex h-full flex-col"
    >
      <div className="grid grid-cols-3 items-center">
        <TabsList className="h-8 w-fit">
          <TabsTrigger value="week" className="text-xs">
            {i18n.t("weekly_view")}
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs">
            {i18n.t("monthly_view")}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center justify-center">
          {showCalendarBy === "week" ? (
            <>
              <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft />
                <span className="sr-only">{i18n.t("previous_week")}</span>
              </Button>
              <Button
                variant="ghost"
                className="min-w-[140px] text-center"
                onClick={() => weekOffset !== 0 && goToCurrentWeek()}
                title={
                  weekOffset !== 0 ? i18n.t("go_to_current_week") : undefined
                }
              >
                {formatDate(weekStart, "M") === formatDate(weekEnd, "M")
                  ? formatDate(weekStart, "MMMM yyyy")
                  : formatDate(weekStart, "MMM") +
                    " - " +
                    formatDate(weekEnd, "MMM yyyy")}
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextWeek}>
                <ChevronRight />
                <span className="sr-only">{i18n.t("next_week")}</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft />
                <span className="sr-only">{i18n.t("previous_month")}</span>
              </Button>
              <Button
                variant="ghost"
                className="min-w-[140px] text-center"
                onClick={() => monthOffset !== 0 && goToCurrentMonth()}
                title={
                  monthOffset !== 0 ? i18n.t("go_to_current_month") : undefined
                }
              >
                {formatDate(currentMonth, "MMMM yyyy")}
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight />
                <span className="sr-only">{i18n.t("next_month")}</span>
              </Button>
            </>
          )}
        </div>
      </div>
      <TabsContent value="week" className="flex h-full flex-1 flex-col">
        {renderWeekView()}
      </TabsContent>
      <TabsContent value="month" className="flex h-full flex-1 flex-col">
        {renderMonthView()}
      </TabsContent>
    </Tabs>
  );
}
