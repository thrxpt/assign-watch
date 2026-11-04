import {
  BookMarked,
  Calendar,
  CircleAlert,
  CircleCheckBig,
  CircleX,
  ClipboardList,
  Clock,
  EyeOff,
  Timer,
  User,
  Users,
} from "lucide-react";

import { ManualDueDateMenu } from "@/components/manual-due-date-menu";
import { StatusBadge } from "@/components/status-badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Separator } from "@/components/ui/separator";
import {
  getAssignmentUrl,
  getRelativeStatusColor,
  getStatusBarColor,
  getSubmissionStatus,
} from "@/lib/assignment";
import { getEffectiveDueDate, hasManualDueDate } from "@/lib/manual-due-dates";
import { hideAssignment } from "@/lib/storage";
import { useI18n } from "@/lib/use-i18n";
import { useTimeFormat } from "@/lib/use-time-format";
import { cn } from "@/lib/utils";
import type { Assignment as AssignmentData, ClassInfo } from "@/types";

interface AssignmentProps {
  assignment: AssignmentData;
  classInfo?: ClassInfo;
}

function SubmissionStatusBadge({ assignment }: { assignment: AssignmentData }) {
  const { t } = useI18n();
  const status = getSubmissionStatus(assignment);

  if (status === "submitted") {
    return (
      <StatusBadge color="green">
        <CircleCheckBig />
        {t("submitted")}
      </StatusBadge>
    );
  }

  if (status === "quiz_not_submitted") {
    return (
      <StatusBadge color="amber">
        <CircleAlert />
        {t("done_not_submitted_yet")}
      </StatusBadge>
    );
  }

  return (
    <StatusBadge color="red">
      <CircleX />
      {t("not_submitted")}
    </StatusBadge>
  );
}

export function Assignment({ assignment, classInfo }: AssignmentProps) {
  const { formatDate, formatDateRelative, t } = useI18n();
  const { formatTime } = useTimeFormat();
  const dueDateValue = getEffectiveDueDate(assignment);
  const dueDate = dueDateValue ? new Date(dueDateValue) : null;
  const relativeDue = dueDate ? formatDateRelative(dueDate) : null;

  const dueTime = (
    <span className="flex items-center gap-1 text-muted-foreground">
      {dueDate ? (
        <Clock className="size-3.5 stroke-muted-foreground" />
      ) : (
        <Calendar className="size-3.5 stroke-muted-foreground" />
      )}
      {dueDate ? formatTime(dueDate) : t("no_due_date")}
      {hasManualDueDate(assignment) && (
        <StatusBadge className="ml-1">{t("manually_set")}</StatusBadge>
      )}
    </span>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            className={cn(
              "relative rounded-lg border p-4 pl-9.25 after:absolute after:inset-y-4 after:left-4 after:w-1.25 after:rounded-full",
              getStatusBarColor(assignment)
            )}
          >
            <a
              className="font-medium text-[15px] underline-offset-4 hover:underline"
              href={getAssignmentUrl(assignment)}
            >
              {assignment.title}
            </a>
            <div className="mt-2 flex h-5.5 items-center gap-2">
              <div className="text-muted-foreground text-sm">
                {classInfo ? (
                  <div className="flex gap-2">
                    {dueTime}
                    <Separator orientation="vertical" />
                    <a
                      className="flex items-center gap-1 text-muted-foreground underline-offset-4 hover:underline"
                      href={`https://app.leb2.org/class/${classInfo.id}/checkAfterAccessClass`}
                    >
                      <BookMarked className="size-3.5 stroke-muted-foreground" />
                      {classInfo.title}
                    </a>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="size-3.5 stroke-muted-foreground" />
                      {dueDate
                        ? formatDate(dueDate, "eeee, d MMM yyyy")
                        : t("no_due_date")}
                    </span>
                    {dueDate && dueTime}
                  </div>
                )}
              </div>
              {!classInfo && relativeDue && (
                <StatusBadge
                  className={getRelativeStatusColor(relativeDue.status)}
                >
                  {relativeDue.text}
                </StatusBadge>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <SubmissionStatusBadge assignment={assignment} />
              <StatusBadge
                color={assignment.type === "ASM" ? "teal" : "orange"}
              >
                {assignment.type === "ASM" ? <ClipboardList /> : <Timer />}
                {assignment.type === "ASM" ? t("assignment") : t("quiz")}
              </StatusBadge>
              <StatusBadge
                color={assignment.group_type === "IND" ? "cyan" : "rose"}
              >
                {assignment.group_type === "IND" ? <User /> : <Users />}
                {assignment.group_type === "IND" ? t("individual") : t("group")}
              </StatusBadge>
            </div>
          </div>
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
