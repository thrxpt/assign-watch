import { EyeOff } from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getAssignmentUrl, getStatusCalendarColor } from "@/lib/assignment";
import { hideAssignment } from "@/lib/storage";
import { useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types";

interface CalendarAssignmentChipProps {
  assignment: Activity;
  classTitle?: string;
  /** "full" adds the due time below the title; "compact" is a single line. */
  size: "compact" | "full";
}

export function CalendarAssignmentChip({
  assignment,
  classTitle,
  size,
}: CalendarAssignmentChipProps) {
  const { formatDate, t } = useI18n();
  const isCompact = size === "compact";

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
                <div>{formatDate(new Date(assignment.due_date), "p")}</div>
              </>
            )}
          </a>
        }
      />
      <ContextMenuContent>
        <ContextMenuItem onClick={() => hideAssignment(assignment.id)}>
          <EyeOff />
          {t("hide_assignment")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
