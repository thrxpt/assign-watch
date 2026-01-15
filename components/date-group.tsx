import { Activity, ClassInfo } from "@/types";
import { i18n } from "#i18n";
import { isToday, isTomorrow } from "date-fns";

import { cn, formatDate } from "@/lib/utils";
import { Assignment } from "@/components/assignment";

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
          <div className="text-lg font-medium">
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
              key={assignment.id}
              assignment={assignment}
              classInfo={classInfo}
            />
          );
        })}
      </div>
    </div>
  );
}
