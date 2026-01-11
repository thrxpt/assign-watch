import { Activity, ClassInfo } from "@/types";

import { cn, formatDate, formatDateRelative } from "@/lib/utils";
import { Assignment } from "@/components/assignment";

interface DateGroupProps {
  date: string;
  assignments: Activity[];
  classInfoMap: Map<number, ClassInfo>;
}

export function DateGroup({ date, assignments, classInfoMap }: DateGroupProps) {
  const dateObj = new Date(date);
  const relativeDate = formatDateRelative(dateObj);
  const formattedDate = formatDate(dateObj, "d MMMM yyyy");

  return (
    <div className="flex gap-3">
      <div className="w-48 rounded-lg bg-muted p-4">
        <div className={cn(assignments.length > 1 && "sticky top-4")}>
          <div className="text-lg font-medium">{formattedDate}</div>
          <div
            className={cn(
              "text-xs",
              relativeDate.status === "late"
                ? "text-red-500"
                : relativeDate.status === "today"
                  ? "text-yellow-500"
                  : "text-green-500",
            )}
          >
            {relativeDate.text}
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
