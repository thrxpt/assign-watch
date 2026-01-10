import { Activity, ClassInfo } from "@/types";
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

import {
  cn,
  formatDate,
  formatDateRelative,
  getSubmissionStatus,
  hideAssignment,
} from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";

interface AssignmentProps {
  assignment: Activity;
  classInfo?: ClassInfo;
}

export function Assignment({ assignment, classInfo }: AssignmentProps) {
  const getAssignmentStatusColor = (assignment: Activity) => {
    if (getSubmissionStatus(assignment) === "submitted") {
      return cn("after:bg-green-500/70");
    } else if (getSubmissionStatus(assignment) === "not_submitted") {
      return cn("after:bg-red-500/70");
    } else if (getSubmissionStatus(assignment) === "in_progress") {
      return cn("after:bg-neutral-500/70");
    } else if (getSubmissionStatus(assignment) === "quiz_not_submitted") {
      return cn("after:bg-amber-500/70");
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "relative rounded-lg border p-4 pl-9.25 after:absolute after:inset-y-4 after:left-4 after:w-1.25 after:rounded-full",
            getAssignmentStatusColor(assignment),
          )}
        >
          <a
            className="text-[15px] font-medium underline-offset-4 hover:underline"
            href={`https://app.leb2.org/class/${assignment.class_id}/${
              assignment.type === "ASM" ? "activity" : "quiz"
            }/${assignment.id}`}
          >
            {assignment.title}
          </a>
          <div className="mt-2 flex h-5.5 items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {classInfo ? (
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5 stroke-muted-foreground" />
                    {formatDate(new Date(assignment.due_date), "p")}
                  </span>
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
                    {formatDate(
                      new Date(assignment.due_date),
                      "eeee, d MMM yyyy",
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5 stroke-muted-foreground" />
                    {formatDate(new Date(assignment.due_date), "p")}
                  </span>
                </div>
              )}
            </div>
            {!classInfo && (
              <StatusBadge
                className={cn(
                  formatDateRelative(new Date(assignment.due_date)).status ===
                    "late"
                    ? "text-red-600"
                    : formatDateRelative(new Date(assignment.due_date))
                          .status === "today"
                      ? "text-yellow-600"
                      : "text-green-600",
                )}
              >
                {formatDateRelative(new Date(assignment.due_date)).text}
              </StatusBadge>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <StatusBadge
              color={
                getSubmissionStatus(assignment) === "submitted"
                  ? "green"
                  : getSubmissionStatus(assignment) === "quiz_not_submitted"
                    ? "amber"
                    : "red"
              }
            >
              {getSubmissionStatus(assignment) === "submitted" ? (
                <CircleCheckBig />
              ) : getSubmissionStatus(assignment) === "quiz_not_submitted" ? (
                <CircleAlert />
              ) : (
                <CircleX />
              )}
              {getSubmissionStatus(assignment) === "submitted"
                ? i18n.t("submitted")
                : getSubmissionStatus(assignment) === "quiz_not_submitted"
                  ? i18n.t("done_not_submitted_yet")
                  : i18n.t("not_submitted")}
            </StatusBadge>
            <StatusBadge color={assignment.type === "ASM" ? "teal" : "orange"}>
              {assignment.type === "ASM" ? <ClipboardList /> : <Timer />}
              {assignment.type === "ASM"
                ? i18n.t("assignment")
                : i18n.t("quiz")}
            </StatusBadge>
            <StatusBadge
              color={assignment.group_type === "IND" ? "cyan" : "rose"}
            >
              {assignment.group_type === "IND" ? <User /> : <Users />}
              {assignment.group_type === "IND"
                ? i18n.t("individual")
                : i18n.t("group")}
            </StatusBadge>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => hideAssignment(assignment.id)}>
          <EyeOff />
          {i18n.t("hide_assignment")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
