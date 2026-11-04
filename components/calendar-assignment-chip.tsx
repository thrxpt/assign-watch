import { EyeOff } from "lucide-react";

import { ManualDueDateMenu } from "@/components/manual-due-date-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getAssignmentUrl, getStatusCalendarColor } from "@/lib/assignment";
import { getEffectiveDueDate, hasManualDueDate } from "@/lib/manual-due-dates";
import { hideAssignment } from "@/lib/storage";
import { useI18n } from "@/lib/use-i18n";
import { useTimeFormat } from "@/lib/use-time-format";
import { cn } from "@/lib/utils";
import type { Assignment as AssignmentData } from "@/types";

interface CalendarAssignmentChipProps {
  assignment: AssignmentData;
  classTitle?: string;
  /** "full" adds the due time below the title; "compact" is a single line. */
  size: "compact" | "full";
}

export function CalendarAssignmentChip({
  assignment,
  classTitle,
  size,
}: CalendarAssignmentChipProps) {
  const { t } = useI18n();
  const { formatTime } = useTimeFormat();
  const isCompact = size === "compact";

  const dueDate = getEffectiveDueDate(assignment);
  if (!dueDate) {
    return null;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <a
            className={cn(
              "block rounded-sm border transition-colors",
              isCompact ? "truncate px-1 py-0.5 text-[10px]" : "p-2 text-xs",
              getStatusCalendarColor(assignment)
            )}
            href={getAssignmentUrl(assignment)}
            title={`${assignment.title} - ${classTitle}`}
          >
            {isCompact ? (
              assignment.title
            ) : (
              <>
                <div className="truncate font-medium">{assignment.title}</div>
                <div>{formatTime(new Date(dueDate))}</div>
              </>
            )}
            {hasManualDueDate(assignment) && (
              <span className="ml-1 text-[10px]">({t("manually_set")})</span>
            )}
          </a>
        }
      />
      <ContextMenuContent>
        <ManualDueDateMenu assignment={assignment} />
        <ContextMenuItem onClick={() => hideAssignment(assignment.id)}>
          <EyeOff />
          {t("hide_assignment")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
