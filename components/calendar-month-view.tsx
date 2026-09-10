import { isSameMonth, isToday } from "date-fns";

import { CalendarAssignmentChip } from "@/components/calendar-assignment-chip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DayEntry } from "@/lib/group-assignments";
import { useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";

const DAYS_PER_WEEK = 7;
/** Past this many rows the cells get short, so show fewer chips per day. */
const CROWDED_WEEK_COUNT = 5;
const CHIPS_PER_CROWDED_DAY = 2;
const CHIPS_PER_DAY = 3;

interface CalendarMonthDayProps extends DayEntry {
  currentMonth: Date;
  getClassTitle: (classId: number) => string | undefined;
  isLastColumn: boolean;
  maxChips: number;
}

function CalendarMonthDay({
  assignments,
  currentMonth,
  day,
  getClassTitle,
  isLastColumn,
  maxChips,
}: CalendarMonthDayProps) {
  const { formatDate, t } = useI18n();
  const isInMonth = isSameMonth(day, currentMonth);
  const overflowCount = assignments.length - maxChips;

  return (
    <div
      className={cn(
        "overflow-hidden p-1",
        !isLastColumn && "border-r",
        !isInMonth && "bg-muted/20 opacity-50"
      )}
    >
      <div className="mb-1 text-center">
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
            isToday(day) && "bg-[#17b5be] text-white",
            !(isToday(day) || isInMonth) && "text-muted-foreground"
          )}
        >
          {formatDate(day, "d")}
        </span>
      </div>
      <div className="max-h-[calc(100%-24px)] space-y-0.5 overflow-y-auto">
        {assignments.slice(0, maxChips).map((assignment) => (
          <CalendarAssignmentChip
            assignment={assignment}
            classTitle={getClassTitle(assignment.class_id)}
            key={assignment.id}
            size="compact"
          />
        ))}
        {overflowCount > 0 && (
          <Popover>
            <PopoverTrigger
              render={
                <div className="block cursor-pointer truncate rounded-sm px-1 py-0.5 text-[10px] transition-colors hover:bg-accent hover:text-accent-foreground">
                  +{overflowCount} {t("more")}
                </div>
              }
            />
            <PopoverContent className="w-fit" side="right">
              {assignments.map((assignment) => (
                <CalendarAssignmentChip
                  assignment={assignment}
                  classTitle={getClassTitle(assignment.class_id)}
                  key={assignment.id}
                  size="compact"
                />
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

interface CalendarMonthViewProps {
  currentMonth: Date;
  days: DayEntry[];
  getClassTitle: (classId: number) => string | undefined;
  weekdays: Date[];
}

export function CalendarMonthView({
  currentMonth,
  days,
  getClassTitle,
  weekdays,
}: CalendarMonthViewProps) {
  const { formatDate } = useI18n();
  const weeks: DayEntry[][] = [];
  for (let i = 0; i < days.length; i += DAYS_PER_WEEK) {
    weeks.push(days.slice(i, i + DAYS_PER_WEEK));
  }

  const maxChips =
    weeks.length > CROWDED_WEEK_COUNT ? CHIPS_PER_CROWDED_DAY : CHIPS_PER_DAY;

  return (
    <div className="flex h-full flex-1 flex-col rounded-lg border">
      <div className="grid shrink-0 grid-cols-7 border-b bg-muted/30">
        {weekdays.map((weekday, index) => (
          <div
            className={cn(
              "px-1 py-2 text-center font-medium text-muted-foreground text-xs uppercase",
              index < DAYS_PER_WEEK - 1 && "border-r"
            )}
            key={weekday.toISOString()}
          >
            {formatDate(weekday, "EEE")}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div
          className="grid h-full"
          style={{
            gridTemplateRows: `repeat(${weeks.length}, minmax(80px, 1fr))`,
          }}
        >
          {weeks.map((week, weekIndex) => (
            <div
              className={cn(
                "grid min-h-20 grid-cols-7",
                weekIndex < weeks.length - 1 && "border-b"
              )}
              key={week[0].day.toISOString()}
            >
              {week.map((entry, dayIndex) => (
                <CalendarMonthDay
                  assignments={entry.assignments}
                  currentMonth={currentMonth}
                  day={entry.day}
                  getClassTitle={getClassTitle}
                  isLastColumn={dayIndex === DAYS_PER_WEEK - 1}
                  key={entry.day.toISOString()}
                  maxChips={maxChips}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
