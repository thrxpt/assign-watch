import { CalendarClock, CalendarX } from "lucide-react";

import { useManualDueDateEditor } from "@/components/manual-due-date-editor";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { useI18n } from "@/lib/use-i18n";
import type { Assignment } from "@/types";

export function ManualDueDateMenu({ assignment }: { assignment: Assignment }) {
  const { t } = useI18n();
  const { canEdit, openEditor, removeDate } = useManualDueDateEditor();
  if (!canEdit || (assignment.due_date && !assignment.manualDueDate)) {
    return null;
  }
  return (
    <>
      {!assignment.due_date && (
        <ContextMenuItem onClick={() => openEditor(assignment)}>
          <CalendarClock />
          {assignment.manualDueDate
            ? t("manual_due_date_edit")
            : t("manual_due_date_set")}
        </ContextMenuItem>
      )}
      {assignment.manualDueDate && (
        <ContextMenuItem onClick={() => removeDate(assignment)}>
          <CalendarX />
          {t("manual_due_date_remove")}
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
    </>
  );
}
