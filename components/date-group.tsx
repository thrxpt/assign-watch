import { isToday, isTomorrow, parse } from "date-fns";

import { Assignment } from "@/components/assignment";
import { StatusBadge } from "@/components/status-badge";
import { getRelativeStatusColor } from "@/lib/assignment";
import { useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";
import type { Activity, ClassInfo } from "@/types";

interface DateGroupProps {
  assignments: Activity[];
  classInfoMap: Map<number, ClassInfo>;
  date: string;
}

export function DateGroup({ date, assignments, classInfoMap }: DateGroupProps) {
  const { formatDate, formatDateRelative, t } = useI18n();
  const dateObj = parse(date, "yyyy-MM-dd", new Date());

  let earliestDueDate: Date | null = null;
  for (const curr of assignments) {
    const current = new Date(curr.due_date);
    if (!earliestDueDate || current.getTime() < earliestDueDate.getTime()) {
      earliestDueDate = current;
    }
  }

  const relative = formatDateRelative(earliestDueDate ?? dateObj);

  let dateLabel = formatDate(dateObj, "d MMMM yyyy");
  if (isToday(dateObj)) {
    dateLabel = t("today");
  } else if (isTomorrow(dateObj)) {
    dateLabel = t("tomorrow");
  }

  return (
    <div className="flex gap-3">
      <div className="w-48 rounded-lg bg-muted p-4">
        <div className={cn(assignments.length > 1 && "sticky top-4")}>
          <div className="font-medium text-lg">{dateLabel}</div>
          <StatusBadge
            className={cn(
              "mt-1 bg-white/50",
              getRelativeStatusColor(relative.status)
            )}
          >
            {relative.text}
          </StatusBadge>
        </div>
      </div>
      <div className="flex w-full flex-col gap-3">
        {assignments.map((assignment) => {
          const classInfo = classInfoMap.get(assignment.class_id);
          return (
            <Assignment
              assignment={assignment}
              classInfo={classInfo}
              key={assignment.id}
            />
          );
        })}
      </div>
    </div>
  );
}
