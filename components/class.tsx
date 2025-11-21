import { Activity, ClassInfo } from "@/types";
import { EyeOff } from "lucide-react";

import { cn, hideClass } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Assignment } from "@/components/assignment";

interface ClassProps {
  classInfo: ClassInfo;
  assignments: Activity[];
}

export function Class({ classInfo, assignments }: ClassProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex gap-3">
          <div className="w-48 rounded-lg bg-muted p-4">
            <div className={cn(assignments.length > 1 && "sticky top-4")}>
              <a
                className="text-lg font-medium underline-offset-4 hover:underline"
                href={`https://app.leb2.org/class/${classInfo.id}/checkAfterAccessClass`}
              >
                {classInfo.title}
              </a>
              <div
                className={cn(
                  "text-xs text-muted-foreground",
                  assignments.length === 1 && "line-clamp-3",
                )}
              >
                {classInfo.description}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3">
            {assignments.map((assignment) => (
              <Assignment key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => hideClass(classInfo.id)}>
          <EyeOff />
          ซ่อนวิชานี้
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
