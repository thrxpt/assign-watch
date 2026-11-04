import { endOfDay } from "date-fns";
import {
  createContext,
  use,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveManualDueDate } from "@/lib/manual-due-date-storage";
import { parseLocalDateTime, toLocalDateTime } from "@/lib/manual-due-dates";
import { useI18n } from "@/lib/use-i18n";
import type { Assignment } from "@/types";

interface ManualDueDateActions {
  canEdit: boolean;
  openEditor: (assignment: Assignment) => void;
  removeDate: (assignment: Assignment) => Promise<void>;
}

const ManualDueDateContext = createContext<ManualDueDateActions | null>(null);

export function useManualDueDateEditor(): ManualDueDateActions {
  const context = use(ManualDueDateContext);
  if (!context) {
    throw new Error("Manual due date actions require a ManualDueDateProvider");
  }
  return context;
}

interface ManualDueDateDialogProps {
  assignment: Assignment;
  initialError: boolean;
  userId: string;
  onClose: () => void;
}

function ManualDueDateDialog({
  assignment,
  initialError,
  userId,
  onClose,
}: ManualDueDateDialogProps) {
  const { t } = useI18n();
  const dateId = useId();
  const timezoneId = useId();
  const errorId = useId();
  const [value, setValue] = useState(() =>
    toLocalDateTime(
      assignment.manualDueDate
        ? new Date(assignment.manualDueDate)
        : endOfDay(new Date())
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(
    initialError ? t("manual_due_date_save_error") : ""
  );
  const timezone = useMemo(
    () => new Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );
  const hasOfficialDate = Boolean(assignment.due_date);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dueDate = parseLocalDateTime(value);
    if (!dueDate || hasOfficialDate) {
      setError(t("manual_due_date_invalid"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveManualDueDate(userId, assignment, dueDate);
      onClose();
    } catch {
      setError(t("manual_due_date_save_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !saving) {
          onClose();
        }
      }}
      open
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <form className="flex min-w-0 flex-col gap-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {assignment.manualDueDate
                ? t("edit_due_date")
                : t("set_due_date")}
            </DialogTitle>
            <DialogDescription>{assignment.title}</DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("manual_due_date_description")}
          </p>
          {hasOfficialDate && <output>{t("manual_due_date_official")}</output>}
          <FieldGroup>
            <Field
              data-disabled={saving || hasOfficialDate}
              data-invalid={Boolean(error)}
            >
              <FieldLabel htmlFor={dateId}>{t("due_date_and_time")}</FieldLabel>
              <Input
                aria-describedby={`${timezoneId}${error ? ` ${errorId}` : ""}`}
                aria-invalid={Boolean(error)}
                disabled={saving || hasOfficialDate}
                id={dateId}
                onChange={(event) => setValue(event.target.value)}
                required
                type="datetime-local"
                value={value}
              />
              <FieldDescription id={timezoneId}>
                {t("due_date_timezone", { timezone })}
              </FieldDescription>
            </Field>
          </FieldGroup>
          {error && (
            <p className="text-destructive text-sm" id={errorId} role="alert">
              {error}
            </p>
          )}
          <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
            <Button
              disabled={saving}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              {t("cancel")}
            </Button>
            <Button disabled={saving || hasOfficialDate} type="submit">
              {saving ? t("saving") : t("save_due_date")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ManualDueDateProvider({
  children,
  assignments,
  userId,
}: {
  children: ReactNode;
  assignments: Assignment[];
  userId: string | null;
}) {
  const [selection, setSelection] = useState<{
    classId: number;
    id: number;
    error: boolean;
  } | null>(null);
  const openEditor = useCallback(
    (assignment: Assignment) =>
      setSelection({
        classId: assignment.class_id,
        error: false,
        id: assignment.id,
      }),
    []
  );
  const removeDate = useCallback(
    async (assignment: Assignment) => {
      if (!userId) {
        return;
      }
      try {
        await saveManualDueDate(userId, assignment, null);
      } catch {
        setSelection({
          classId: assignment.class_id,
          error: true,
          id: assignment.id,
        });
      }
    },
    [userId]
  );
  const context = useMemo(
    () => ({ canEdit: Boolean(userId), openEditor, removeDate }),
    [userId, openEditor, removeDate]
  );
  const selected = selection
    ? assignments.find(
        (assignment) =>
          assignment.class_id === selection.classId &&
          assignment.id === selection.id
      )
    : undefined;

  return (
    <ManualDueDateContext.Provider value={context}>
      {children}
      {selected && userId && (
        <ManualDueDateDialog
          assignment={selected}
          initialError={selection?.error ?? false}
          key={`${selected.class_id}:${selected.id}`}
          onClose={() => setSelection(null)}
          userId={userId}
        />
      )}
    </ManualDueDateContext.Provider>
  );
}
