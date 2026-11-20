import { isToday, isTomorrow, parse } from "date-fns";

import { Assignment } from "@/components/assignment";
import { StatusBadge } from "@/components/status-badge";
import { getRelativeStatusColor } from "@/lib/assignment";
import { getEffectiveDueDate } from "@/lib/manual-due-dates";
import { assignmentStaggerDelay, groupStaggerDelay } from "@/lib/stagger";
import { useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";
import type { Assignment as AssignmentData, ClassInfo } from "@/types";

interface DateGroupProps {
  assignments: AssignmentData[];
  classInfoMap: Map<number, ClassInfo>;
  date: string | null;
  staggerIndex: number;
}

export function DateGroup({
  date,
  assignments,
  classInfoMap,
  staggerIndex,
}: DateGroupProps) {
  const { formatDate, formatDateRelative, t } = useI18n();
  const dateObj = date ? parse(date, "yyyy-MM-dd", new Date()) : null;

  let earliestDueDate: Date | null = null;
  for (const curr of assignments) {
    const dueDate = getEffectiveDueDate(curr);
    if (!dueDate) {
      continue;
    }
    const current = new Date(dueDate);
    if (!earliestDueDate || current.getTime() < earliestDueDate.getTime()) {
      earliestDueDate = current;
    }
  }

  const relativeDate = earliestDueDate ?? dateObj;
  const relative = relativeDate ? formatDateRelative(relativeDate) : null;

  let dateLabel = t("no_due_date");
  if (dateObj) {
    dateLabel = formatDate(dateObj, "d MMMM yyyy");
    if (isToday(dateObj)) {
      dateLabel = t("today");
    } else if (isTomorrow(dateObj)) {
      dateLabel = t("tomorrow");
    }
  }

  return (
    <div
      className="flex gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-[400ms] motion-safe:ease-out motion-safe:fill-mode-backwards"
      style={{ animationDelay: `${groupStaggerDelay(staggerIndex)}ms` }}
    >
      <div className="w-48 rounded-lg bg-muted p-4">
        <div className={cn(assignments.length > 1 && "sticky top-4")}>
          <div className="font-medium text-lg">{dateLabel}</div>
          {relative && (
            <StatusBadge
              className={cn(
                "mt-1 bg-white/50",
                getRelativeStatusColor(relative.status)
              )}
            >
              {relative.text}
            </StatusBadge>
          )}
        </div>
      </div>
      <div className="flex w-full flex-col gap-3">
        {assignments.map((assignment, index) => {
          const classInfo = classInfoMap.get(assignment.class_id);
          return (
            <Assignment
              assignment={assignment}
              classInfo={classInfo}
              key={assignment.id}
              staggerDelayMs={assignmentStaggerDelay(staggerIndex, index)}
            />
          );
        })}
      </div>
    </div>
  );
}
