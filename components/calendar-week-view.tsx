import { isToday } from "date-fns";

import { CalendarAssignmentChip } from "@/components/calendar-assignment-chip";
import type { DayEntry } from "@/lib/group-assignments";
import { useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";

interface CalendarWeekViewProps {
  days: DayEntry[];
  getClassTitle: (classId: number) => string | undefined;
}

export function CalendarWeekView({
  days,
  getClassTitle,
}: CalendarWeekViewProps) {
  const { formatDate } = useI18n();
  return (
    <div className="grid h-full flex-1 grid-cols-7 rounded-lg border">
      {days.map(({ day, assignments }) => (
        <div className="not-last:border-r px-1 py-3" key={day.toISOString()}>
          <div className="mb-3 text-center">
            <div
              className={cn(
                "font-medium text-muted-foreground text-xs uppercase",
                isToday(day) && "text-[#17b5be]"
              )}
            >
              {formatDate(day, "EEE")}
            </div>
            <div
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full text-xl tabular-nums",
                isToday(day) && "bg-[#17b5be] text-white"
              )}
            >
              {formatDate(day, "d")}
            </div>
          </div>
          <div className="space-y-1">
            {assignments.map((assignment) => (
              <CalendarAssignmentChip
                assignment={assignment}
                classTitle={getClassTitle(assignment.class_id)}
                key={assignment.id}
                size="full"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
