import { Activity, ClassInfo } from "@/types";
import { i18n } from "#i18n";
import { BrushCleaning, Eye, EyeOff } from "lucide-react";

import {
  clearAllHiddenItems,
  unhideAssignment,
  unhideClass,
} from "@/lib/utils";
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
import { StatusBadge } from "@/components/status-badge";
import { Tips } from "@/components/tips";

interface HiddenItemsManagerProps {
  hiddenClasses: number[];
  hiddenAssignments: number[];
  allClassInfo: ClassInfo[];
  allAssignments: (Activity[] | undefined)[];
}

export function HiddenItemsManager({
  hiddenClasses,
  hiddenAssignments,
  allClassInfo,
  allAssignments,
}: HiddenItemsManagerProps) {
  const hiddenClassItems = hiddenClasses
    .map((classId) => allClassInfo.find((c) => c.id === classId))
    .filter((c) => c !== undefined);

  const hiddenAssignmentItems = hiddenAssignments
    .map((assignmentId) => {
      for (const assignments of allAssignments) {
        if (assignments) {
          const found = assignments.find((a) => a.id === assignmentId);
          if (found) return found;
        }
      }
      return undefined;
    })
    .filter((a) => a !== undefined);

  const totalHidden = hiddenClassItems.length + hiddenAssignmentItems.length;

  if (totalHidden === 0) {
    return <Tips />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <EyeOff />
          {i18n.t("hidden")}
          {totalHidden > 0 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">
              {totalHidden}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between">
          <DropdownMenuLabel>{i18n.t("hidden_items")}</DropdownMenuLabel>
          <Button variant="outline" size="xs" onClick={clearAllHiddenItems}>
            <BrushCleaning />
            {i18n.t("clear_all")}
          </Button>
        </div>
        <DropdownMenuSeparator />

        {hiddenClassItems.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {i18n.t("class")}
            </DropdownMenuLabel>
            {hiddenClassItems.map((classInfo) => (
              <DropdownMenuItem
                key={classInfo.id}
                onSelect={(e) => {
                  e.preventDefault();
                  unhideClass(classInfo.id);
                }}
                title={classInfo.title}
              >
                <span className="flex-1 truncate">{classInfo.title}</span>
                <Eye className="shrink-0" />
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}

        {hiddenClassItems.length > 0 && hiddenAssignmentItems.length > 0 && (
          <DropdownMenuSeparator />
        )}

        {hiddenAssignmentItems.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {i18n.t("assignment")}
            </DropdownMenuLabel>
            {hiddenAssignmentItems.map((assignment) => (
              <DropdownMenuItem
                key={assignment.id}
                onSelect={(e) => {
                  e.preventDefault();
                  unhideAssignment(assignment.id);
                }}
                title={assignment.title}
              >
                <StatusBadge className="px-1 text-xs">
                  {
                    allClassInfo.findLast((c) => c.id === assignment.class_id)
                      ?.title
                  }
                </StatusBadge>
                <span className="flex-1 truncate">{assignment.title}</span>
                <Eye className="shrink-0" />
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
