import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { CalendarMonthView } from "@/components/calendar-month-view";
import { CalendarWeekView } from "@/components/calendar-week-view";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupByDay } from "@/lib/group-assignments";
import type { ShowCalendarBy } from "@/lib/preferences";
import { showCalendarByStorage } from "@/lib/storage";
import { useI18n } from "@/lib/use-i18n";
import { useStorageState } from "@/lib/use-storage-state";
import type { VisibleAssignment } from "@/lib/visible-assignments";

const WEEK_STARTS_ON_SUNDAY = { weekStartsOn: 0 } as const;

interface CalendarViewProps {
  assignments: VisibleAssignment[];
}

export function CalendarView({ assignments }: CalendarViewProps) {
  const { formatDate, t } = useI18n();
  const [showCalendarBy, setShowCalendarBy] = useStorageState(
    showCalendarByStorage
  );

  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();

  const currentWeek = addWeeks(now, weekOffset);
  const weekStart = startOfWeek(currentWeek, WEEK_STARTS_ON_SUNDAY);
  const weekEnd = endOfWeek(currentWeek, WEEK_STARTS_ON_SUNDAY);
  const daysInWeek = eachDayOfInterval({ end: weekEnd, start: weekStart });

  const currentMonth = addMonths(now, monthOffset);
  const calendarStart = startOfWeek(
    startOfMonth(currentMonth),
    WEEK_STARTS_ON_SUNDAY
  );
  const calendarEnd = endOfWeek(
    endOfMonth(currentMonth),
    WEEK_STARTS_ON_SUNDAY
  );
  const daysInMonth = eachDayOfInterval({
    end: calendarEnd,
    start: calendarStart,
  });

  const assignmentsByDayWeek = groupByDay(assignments, daysInWeek);
  const assignmentsByDayMonth = groupByDay(assignments, daysInMonth);

  const classTitles = new Map(
    assignments.map(({ classInfo }) => [classInfo.id, classInfo.title])
  );
  const getClassTitle = (classId: number) => classTitles.get(classId);

  const weekRangeLabel =
    formatDate(weekStart, "M") === formatDate(weekEnd, "M")
      ? formatDate(weekStart, "MMMM yyyy")
      : `${formatDate(weekStart, "MMM")} - ${formatDate(weekEnd, "MMM yyyy")}`;

  const currentWeekTitle =
    weekOffset === 0 ? undefined : t("go_to_current_week");
  const currentMonthTitle =
    monthOffset === 0 ? undefined : t("go_to_current_month");

  return (
    <Tabs
      className="flex h-full flex-col"
      onValueChange={(value) => setShowCalendarBy(value as ShowCalendarBy)}
      value={showCalendarBy}
    >
      <div className="grid grid-cols-3 items-center">
        <TabsList className="h-8 w-fit">
          <TabsTrigger className="text-xs" value="week">
            {t("weekly_view")}
          </TabsTrigger>
          <TabsTrigger className="text-xs" value="month">
            {t("monthly_view")}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center justify-center">
          {showCalendarBy === "week" ? (
            <>
              <Button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                size="icon"
                variant="ghost"
              >
                <ChevronLeft />
                <span className="sr-only">{t("previous_week")}</span>
              </Button>
              <Button
                className="min-w-35 text-center"
                onClick={() => setWeekOffset(0)}
                title={currentWeekTitle}
                variant="ghost"
              >
                {weekRangeLabel}
              </Button>
              <Button
                onClick={() => setWeekOffset((prev) => prev + 1)}
                size="icon"
                variant="ghost"
              >
                <ChevronRight />
                <span className="sr-only">{t("next_week")}</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setMonthOffset((prev) => prev - 1)}
                size="icon"
                variant="ghost"
              >
                <ChevronLeft />
                <span className="sr-only">{t("previous_month")}</span>
              </Button>
              <Button
                className="min-w-35 text-center"
                onClick={() => setMonthOffset(0)}
                title={currentMonthTitle}
                variant="ghost"
              >
                {formatDate(currentMonth, "MMMM yyyy")}
              </Button>
              <Button
                onClick={() => setMonthOffset((prev) => prev + 1)}
                size="icon"
                variant="ghost"
              >
                <ChevronRight />
                <span className="sr-only">{t("next_month")}</span>
              </Button>
            </>
          )}
        </div>
      </div>
      <TabsContent className="flex h-full flex-1 flex-col" value="week">
        <CalendarWeekView
          days={assignmentsByDayWeek}
          getClassTitle={getClassTitle}
        />
      </TabsContent>
      <TabsContent className="flex h-full flex-1 flex-col" value="month">
        <CalendarMonthView
          currentMonth={currentMonth}
          days={assignmentsByDayMonth}
          getClassTitle={getClassTitle}
          weekdays={daysInWeek}
        />
      </TabsContent>
    </Tabs>
  );
}
