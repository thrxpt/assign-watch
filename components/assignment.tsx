import { Activity } from "@/types";
import {
  CircleCheckBig,
  CircleX,
  ClipboardList,
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
import { StatusBadge } from "@/components/status-badge";

interface AssignmentProps {
  assignment: Activity;
}

export function Assignment({ assignment }: AssignmentProps) {
  const getAssignmentStatusColor = (assignment: Activity) => {
    if (getSubmissionStatus(assignment) === "submitted") {
      return cn("after:bg-green-500/70");
    } else if (getSubmissionStatus(assignment) === "not_submitted") {
      return cn("after:bg-red-500/70");
    } else if (getSubmissionStatus(assignment) === "in_progress") {
      return cn("after:bg-primary/70");
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "relative rounded-lg border p-4 pl-9.25 after:absolute after:inset-y-4 after:left-4 after:w-1.25 after:rounded-full after:bg-primary/70",
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
          <div className="mt-2 flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {formatDate(new Date(assignment.due_date))}
            </div>
            <StatusBadge
              className={cn(
                formatDateRelative(new Date(assignment.due_date)).status ===
                  "late"
                  ? "text-red-600"
                  : formatDateRelative(new Date(assignment.due_date)).status ===
                      "today"
                    ? "text-yellow-600"
                    : "text-green-600",
              )}
            >
              {formatDateRelative(new Date(assignment.due_date)).text}
            </StatusBadge>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <StatusBadge
              color={assignment.activity_submission_id ? "green" : "red"}
            >
              {assignment.activity_submission_id ? (
                <CircleCheckBig />
              ) : (
                <CircleX />
              )}
              {assignment.activity_submission_id ? "ส่งแล้ว" : "ยังไม่ส่ง"}
            </StatusBadge>
            <StatusBadge color={assignment.type === "ASM" ? "teal" : "orange"}>
              {assignment.type === "ASM" ? <ClipboardList /> : <Timer />}
              {assignment.type === "ASM" ? "การบ้าน" : "แบบทดสอบ"}
            </StatusBadge>
            <StatusBadge
              color={assignment.group_type === "IND" ? "cyan" : "rose"}
            >
              {assignment.group_type === "IND" ? <User /> : <Users />}
              {assignment.group_type === "IND" ? "งานเดี่ยว" : "งานกลุ่ม"}
            </StatusBadge>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => hideAssignment(assignment.id)}>
          <EyeOff />
          ซ่อนงานนี้
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
