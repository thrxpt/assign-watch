import { BrushCleaning, Eye, EyeOff } from "lucide-react";

import { useExitAction } from "@/components/animated-collapse";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  clearAllHiddenItems,
  unhideAssignment,
  unhideClass,
} from "@/lib/storage";
import { useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";
import type { Activity, ClassInfo } from "@/types";

const MENU_EXIT_TIMEOUT_MS = 220;

function HiddenClassItem({ classInfo }: { classInfo: ClassInfo }) {
  const { exitThen, isExiting } = useExitAction({
    timeoutMs: MENU_EXIT_TIMEOUT_MS,
  });

  return (
    <DropdownMenuItem
      className={cn(
        "transition duration-200 ease-out motion-reduce:transition-none",
        isExiting && "pointer-events-none translate-x-2 opacity-0"
      )}
      onClick={(event) => {
        event.preventDefault();
        exitThen(() => void unhideClass(classInfo.id));
      }}
      title={classInfo.title}
    >
      <span className="flex-1 truncate">{classInfo.title}</span>
      <Eye className="shrink-0" />
    </DropdownMenuItem>
  );
}

function HiddenAssignmentItem({
  assignment,
  classTitle,
}: {
  assignment: Activity;
  classTitle?: string;
}) {
  const { exitThen, isExiting } = useExitAction({
    timeoutMs: MENU_EXIT_TIMEOUT_MS,
  });

  return (
    <DropdownMenuItem
      className={cn(
        "transition duration-200 ease-out motion-reduce:transition-none",
        isExiting && "pointer-events-none translate-x-2 opacity-0"
      )}
      onClick={(event) => {
        event.preventDefault();
        exitThen(() => void unhideAssignment(assignment.id));
      }}
      title={assignment.title}
    >
      <StatusBadge className="px-1 text-xs">{classTitle}</StatusBadge>
      <span className="flex-1 truncate">{assignment.title}</span>
      <Eye className="shrink-0" />
    </DropdownMenuItem>
  );
}

interface HiddenItemsManagerProps {
  allAssignments: (Activity[] | undefined)[];
  allClassInfo: ClassInfo[];
  hiddenAssignments: number[];
  hiddenClasses: number[];
}

export function HiddenItemsManager({
  hiddenClasses,
  hiddenAssignments,
  allClassInfo,
  allAssignments,
}: HiddenItemsManagerProps) {
  const { t } = useI18n();
  const hiddenClassItems = hiddenClasses
    .map((classId) => allClassInfo.find((c) => c.id === classId))
    .filter((c): c is ClassInfo => c !== undefined);

  const hiddenAssignmentItems = hiddenAssignments
    .map((assignmentId) => {
      for (const assignments of allAssignments) {
        if (assignments) {
          const found = assignments.find((a) => a.id === assignmentId);
          if (found) {
            return found;
          }
        }
      }
      return null;
    })
    .filter((a): a is Activity => a !== null);

  const totalHidden = hiddenClassItems.length + hiddenAssignmentItems.length;

  if (totalHidden === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="secondary">
            <EyeOff />
            {t("hidden")}
            {totalHidden > 0 && (
              <span
                className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs tabular-nums motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-50 motion-safe:duration-200"
                key={totalHidden}
              >
                {totalHidden}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="w-80 transition duration-200 ease-out motion-reduce:transition-none"
      >
        <DropdownMenuGroup>
          <div className="flex items-center justify-between">
            <DropdownMenuLabel>{t("hidden_items")}</DropdownMenuLabel>
            <Button
              onClick={() => void clearAllHiddenItems()}
              size="xs"
              variant="outline"
            >
              <BrushCleaning />
              {t("clear_all")}
            </Button>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {hiddenClassItems.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t("classes")}
            </DropdownMenuLabel>
            {hiddenClassItems.map((classInfo) => (
              <HiddenClassItem classInfo={classInfo} key={classInfo.id} />
            ))}
          </DropdownMenuGroup>
        )}

        {hiddenClassItems.length > 0 && hiddenAssignmentItems.length > 0 && (
          <DropdownMenuSeparator />
        )}

        {hiddenAssignmentItems.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t("assignments")}
            </DropdownMenuLabel>
            {hiddenAssignmentItems.map((assignment) => (
              <HiddenAssignmentItem
                assignment={assignment}
                classTitle={
                  allClassInfo.findLast((c) => c.id === assignment.class_id)
                    ?.title
                }
                key={assignment.id}
              />
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
