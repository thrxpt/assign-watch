import { useState } from "react";
import { Activity, ClassInfo } from "@/types";
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
  const [open, setOpen] = useState(false);

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
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <EyeOff />
          ที่ซ่อนไว้
          {totalHidden > 0 && (
            <span className="bg-primary text-primary-foreground inline-flex size-5 items-center justify-center rounded-full text-xs tabular-nums">
              {totalHidden}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between">
          <DropdownMenuLabel>รายการที่ซ่อนไว้</DropdownMenuLabel>
          <Button variant="outline" size="xs" onClick={clearAllHiddenItems}>
            <BrushCleaning />
            ล้างทั้งหมด
          </Button>
        </div>
        <DropdownMenuSeparator />

        {hiddenClassItems.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              วิชา
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
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              การบ้าน
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
