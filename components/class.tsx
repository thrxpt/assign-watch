import { EyeOff } from "lucide-react";
import { i18n } from "#i18n";
import { Assignment } from "@/components/assignment";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { hideClass } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Activity, ClassInfo } from "@/types";

interface ClassProps {
  assignments: Activity[];
  classInfo: ClassInfo;
}

export function Class({ classInfo, assignments }: ClassProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex gap-3">
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
                Section {classInfo.section}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3">
            {assignments.map((assignment) => (
              <Assignment assignment={assignment} key={assignment.id} />
            ))}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => hideClass(classInfo.id)}>
          <EyeOff />
          {i18n.t("hide_class")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
