import { EyeOff } from "lucide-react";

import {
  AnimatedCollapse,
  useExitAction,
} from "@/components/animated-collapse";
import { Assignment } from "@/components/assignment";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { assignmentStaggerDelay, groupStaggerDelay } from "@/lib/stagger";
import { hideClass } from "@/lib/storage";
import { useI18n } from "@/lib/use-i18n";
import { useMountValue } from "@/lib/use-mount-value";
import { cn } from "@/lib/utils";
import type { Assignment as AssignmentData, ClassInfo } from "@/types";

interface ClassProps {
  assignments: AssignmentData[];
  classInfo: ClassInfo;
  entering?: boolean;
  enteringAssignmentIds: ReadonlySet<number>;
  exitingAssignmentIds: ReadonlySet<number>;
  onExitEnd?: (assignmentIds: readonly number[]) => void;
  onExitStart?: (assignmentIds: readonly number[]) => void;
  staggerIndex: number;
}

export function Class({
  classInfo,
  assignments,
  entering = false,
  enteringAssignmentIds,
  exitingAssignmentIds,
  onExitEnd,
  onExitStart,
  staggerIndex,
}: ClassProps) {
  const { t } = useI18n();
  const { exitThen, isExiting } = useExitAction();
  const animationDelayMs = useMountValue(
    entering ? 0 : groupStaggerDelay(staggerIndex)
  );
  const isSingleAssignmentExiting =
    assignments.length === 1 && exitingAssignmentIds.has(assignments[0].id);

  return (
    <AnimatedCollapse
      className="mt-4"
      entering={entering}
      exiting={isExiting || isSingleAssignmentExiting}
    >
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <div
              className="flex gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-400 motion-safe:ease-out motion-safe:fill-mode-backwards"
              style={{ animationDelay: `${animationDelayMs}ms` }}
            >
              <div className="w-48 rounded-lg bg-muted p-4">
                <div className={cn(assignments.length > 1 && "sticky top-4")}>
                  <a
                    className="font-medium text-lg underline-offset-4 hover:underline"
                    href={`https://app.leb2.org/class/${classInfo.id}/checkAfterAccessClass`}
                  >
                    {classInfo.title}
                  </a>
                  <div
                    className={cn(
                      "text-muted-foreground text-xs",
                      assignments.length === 1 && "line-clamp-2"
                    )}
                  >
                    {classInfo.description}
                  </div>
                  <hr className="my-[0.4rem]" />
                  <div className="text-[11px] text-muted-foreground">
                    {t("section")} {classInfo.section}
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col -mt-3">
                {assignments.map((assignment, index) => {
                  const isAssignmentEntering = enteringAssignmentIds.has(
                    assignment.id
                  );
                  return (
                    <Assignment
                      assignment={assignment}
                      collapseOnExit={assignments.length > 1}
                      containerClassName="mt-3"
                      entering={isAssignmentEntering}
                      key={assignment.id}
                      onExitEnd={onExitEnd}
                      onExitStart={onExitStart}
                      staggerDelayMs={
                        entering || isAssignmentEntering
                          ? 0
                          : assignmentStaggerDelay(staggerIndex, index)
                      }
                    />
                  );
                })}
              </div>
            </div>
          }
        />
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              const assignmentIds = assignments.map(({ id }) => id);
              onExitStart?.(assignmentIds);
              exitThen(async () => {
                try {
                  await hideClass(classInfo.id);
                } finally {
                  onExitEnd?.(assignmentIds);
                }
              });
            }}
          >
            <EyeOff />
            {t("hide_class")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </AnimatedCollapse>
  );
}
