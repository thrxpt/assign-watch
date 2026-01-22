import { isToday, isTomorrow } from "date-fns";
import { i18n } from "#i18n";
import { Assignment } from "@/components/assignment";

import { cn, formatDate } from "@/lib/utils";
import type { Activity, ClassInfo } from "@/types";

interface DateGroupProps {
  date: string;
  assignments: Activity[];
  classInfoMap: Map<number, ClassInfo>;
}

export function DateGroup({ date, assignments, classInfoMap }: DateGroupProps) {
  const dateObj = new Date(date);
  const formattedDate = formatDate(dateObj, "d MMMM yyyy");

  return (
    <div className="flex gap-3">
      <div className="w-48 rounded-lg bg-muted p-4">
        <div className={cn(assignments.length > 1 && "sticky top-4")}>
          <div className="font-medium text-lg">
            {isToday(dateObj)
              ? i18n.t("today")
              : isTomorrow(dateObj)
                ? i18n.t("tomorrow")
                : formattedDate}
          </div>
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
