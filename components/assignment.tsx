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
import { i18n } from "#i18n";
import { StatusBadge } from "@/components/status-badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Separator } from "@/components/ui/separator";
import {
  cn,
  formatDate,
  formatDateRelative,
  getSubmissionStatus,
  hideAssignment,
} from "@/lib/utils";
import type { Activity, ClassInfo } from "@/types";

interface AssignmentProps {
  assignment: Activity;
  classInfo?: ClassInfo;
}

const getAssignmentStatusColor = (assignment: Activity) => {
  if (getSubmissionStatus(assignment) === "submitted") {
    return cn("after:bg-green-500/70");
  }
  if (getSubmissionStatus(assignment) === "not_submitted") {
    return cn("after:bg-red-500/70");
  }
  if (getSubmissionStatus(assignment) === "in_progress") {
    return cn("after:bg-neutral-500/70");
  }
  if (getSubmissionStatus(assignment) === "quiz_not_submitted") {
    return cn("after:bg-amber-500/70");
  }
};

function SubmissionStatusBadge({ assignment }: { assignment: Activity }) {
  const status = getSubmissionStatus(assignment);
  const color =
    status === "submitted"
      ? "green"
      : status === "quiz_not_submitted"
        ? "amber"
        : "red";
  const icon =
    status === "submitted" ? (
      <CircleCheckBig />
    ) : status === "quiz_not_submitted" ? (
      <CircleAlert />
    ) : (
      <CircleX />
    );
  const label =
    status === "submitted"
      ? i18n.t("submitted")
      : status === "quiz_not_submitted"
        ? i18n.t("done_not_submitted_yet")
        : i18n.t("not_submitted");

  return (
    <StatusBadge color={color}>
      {icon}
      {label}
    </StatusBadge>
  );
}

export function Assignment({ assignment, classInfo }: AssignmentProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "relative rounded-lg border p-4 pl-9.25 after:absolute after:inset-y-4 after:left-4 after:w-1.25 after:rounded-full",
            getAssignmentStatusColor(assignment)
          )}
        >
          <a
            className="font-medium text-[15px] underline-offset-4 hover:underline"
            href={`https://app.leb2.org/class/${assignment.class_id}/${
              assignment.type === "ASM" ? "activity" : "quiz"
            }/${assignment.id}`}
          >
            {assignment.title}
          </a>
          <div className="mt-2 flex h-5.5 items-center gap-2">
            <div className="text-muted-foreground text-sm">
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
                      "eeee, d MMM yyyy"
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
                      : "text-green-600"
                )}
              >
                {formatDateRelative(new Date(assignment.due_date)).text}
              </StatusBadge>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <SubmissionStatusBadge assignment={assignment} />
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
