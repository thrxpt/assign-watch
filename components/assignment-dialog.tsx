import { Calendar, LayoutList, Settings } from "lucide-react";
import { useState } from "react";
import type { ComponentProps } from "react";

import { AssignmentFilters } from "@/components/assignment-filters";
import { AssignmentGroup } from "@/components/assignment-group";
import {
  AssignmentLoadError,
  AssignmentStaleWarning,
} from "@/components/assignment-load-error";
import { AssignmentSort } from "@/components/assignment-sort";
import { CalendarView } from "@/components/calendar-view";
import { Class } from "@/components/class";
import { ClassSkeleton } from "@/components/class-skeleton";
import { DateGroup } from "@/components/date-group";
import { DialogTips } from "@/components/dialog-tips";
import { HiddenItemsManager } from "@/components/hidden-items-manager";
import { ManualDueDateProvider } from "@/components/manual-due-date-editor";
import { NoAssignments } from "@/components/no-assignments";
import { NoClasses } from "@/components/no-classes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupByClass, groupByDueDate } from "@/lib/group-assignments";
import type { FilterState, GroupState, SortState } from "@/lib/preferences";
import { useI18n } from "@/lib/use-i18n";
import { useRemovedIds } from "@/lib/use-removed-ids";
import type { VisibleAssignment } from "@/lib/visible-assignments";
import type { Activity, Assignment, ClassInfo } from "@/types";

type LoadErrorProps = Omit<
  ComponentProps<typeof AssignmentLoadError>,
  "presentation"
>;

interface AssignmentDialogProps {
  allAssignments: (Activity[] | undefined)[];
  allClassInfo: ClassInfo[];
  calendarItems: VisibleAssignment[];
  /** Unknown until the roster is known to belong to the signed-in student. */
  enrollment: "known" | "unknown";
  filters: FilterState;
  groupState: GroupState;
  hasFailures: boolean;
  hasStaleData: boolean;
  hiddenAssignments: number[];
  hiddenClasses: number[];
  isOpen: boolean;
  listItems: VisibleAssignment[];
  loadErrorProps: LoadErrorProps;
  onFiltersChange: (filters: FilterState) => void;
  onGroupChange: (state: GroupState) => void;
  onOpenOptions: () => void;
  onOpenChange: (open: boolean) => void;
  onSortChange: (state: SortState) => void;
  pendingClasses: ClassInfo[];
  resolvedAssignments: Assignment[];
  sortState: SortState;
  userId: string | null;
}

export function AssignmentDialog({
  allAssignments,
  allClassInfo,
  calendarItems,
  enrollment,
  filters,
  groupState,
  hasFailures,
  hasStaleData,
  hiddenAssignments,
  hiddenClasses,
  isOpen,
  listItems,
  loadErrorProps,
  onFiltersChange,
  onGroupChange,
  onOpenOptions,
  onOpenChange,
  onSortChange,
  pendingClasses,
  resolvedAssignments,
  sortState,
  userId,
}: AssignmentDialogProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");
  const [exitingAssignmentIds, setExitingAssignmentIds] = useState<
    ReadonlySet<number>
  >(() => new Set());
  // IDs that just left the hidden lists were unhidden and should expand back in.
  const enteringClassIds = useRemovedIds(hiddenClasses);
  const enteringAssignmentIds = useRemovedIds(hiddenAssignments);

  const markAssignmentsExiting = (assignmentIds: readonly number[]) => {
    setExitingAssignmentIds((current) => {
      const next = new Set(current);
      for (const id of assignmentIds) {
        next.add(id);
      }
      return next;
    });
  };

  const finishAssignmentsExiting = (assignmentIds: readonly number[]) => {
    setExitingAssignmentIds((current) => {
      const next = new Set(current);
      for (const id of assignmentIds) {
        next.delete(id);
      }
      return next.size === current.size ? current : next;
    });
  };

  const renderList = () => {
    if (enrollment === "unknown") {
      return <NoClasses className="mt-4" />;
    }

    if (allClassInfo.length === 0) {
      return <NoAssignments className="mt-4" />;
    }

    if (listItems.length === 0 && pendingClasses.length === 0) {
      return hasFailures ? null : <NoAssignments className="mt-4" />;
    }

    const skeletons = pendingClasses.map((classInfo) => (
      <ClassSkeleton className="mt-4" key={classInfo.id} />
    ));
    const classInfoMap = new Map(
      allClassInfo.map((classInfo) => [classInfo.id, classInfo])
    );
    const groups =
      groupState.groupBy === "class"
        ? groupByClass(listItems, sortState).map((group, index) => (
            <Class
              assignments={group.assignments}
              classInfo={group.classInfo}
              entering={
                enteringClassIds.has(group.classInfo.id) ||
                group.assignments.every((assignment) =>
                  enteringAssignmentIds.has(assignment.id)
                )
              }
              enteringAssignmentIds={enteringAssignmentIds}
              exitingAssignmentIds={exitingAssignmentIds}
              key={group.classInfo.id}
              onExitEnd={finishAssignmentsExiting}
              onExitStart={markAssignmentsExiting}
              staggerIndex={index}
            />
          ))
        : groupByDueDate(listItems, sortState).map(
            ({ date, assignments }, index) => (
              <DateGroup
                assignments={assignments}
                classInfoMap={classInfoMap}
                date={date}
                entering={assignments.every((assignment) =>
                  enteringAssignmentIds.has(assignment.id)
                )}
                enteringAssignmentIds={enteringAssignmentIds}
                exitingAssignmentIds={exitingAssignmentIds}
                key={date ?? "undated"}
                onExitEnd={finishAssignmentsExiting}
                onExitStart={markAssignmentsExiting}
                staggerIndex={index}
              />
            )
          );

    return (
      <>
        {groups}
        {skeletons}
      </>
    );
  };

  const renderCalendar = () => {
    if (enrollment === "unknown") {
      return <NoClasses />;
    }

    if (allClassInfo.length === 0) {
      return <NoAssignments />;
    }

    return (
      <div className="min-h-0 flex-1">
        <CalendarView assignments={calendarItems} />
      </div>
    );
  };

  return (
    <div>
      <Dialog onOpenChange={onOpenChange} open={isOpen}>
        <DialogContent
          className="p-6 sm:max-w-3xl"
          initialFocus={false}
          showCloseButton={false}
        >
          <ManualDueDateProvider
            assignments={resolvedAssignments}
            key={userId ?? "unknown"}
            userId={userId}
          >
            <Tabs
              className="gap-4"
              defaultValue="list"
              onValueChange={(value) =>
                setActiveTab(value as "list" | "calendar")
              }
              value={activeTab}
            >
              <DialogHeader className="flex-row items-center justify-between">
                <DialogTitle className="text-xl">
                  {activeTab === "list" ? t("todo") : t("calendar")}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onOpenOptions}
                    size="icon"
                    title={t("settings")}
                    variant="secondary"
                  >
                    <Settings />
                    <span className="sr-only">{t("settings")}</span>
                  </Button>
                  <HiddenItemsManager
                    allAssignments={allAssignments}
                    allClassInfo={allClassInfo}
                    hiddenAssignments={hiddenAssignments}
                    hiddenClasses={hiddenClasses}
                  />
                  <AssignmentSort
                    onSortChange={onSortChange}
                    sortState={sortState}
                  />
                  <AssignmentFilters
                    filters={filters}
                    onFiltersChange={onFiltersChange}
                  />
                  {activeTab === "list" && (
                    <AssignmentGroup
                      groupState={groupState}
                      onGroupChange={onGroupChange}
                    />
                  )}
                  <TabsList className="h-8">
                    <TabsTrigger value="list">
                      <LayoutList />
                      <span className="sr-only">{t("list_view")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="calendar">
                      <Calendar />
                      <span className="sr-only">{t("calendar_view")}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </DialogHeader>
              <TabsContent value="list">
                <ScrollArea className="rounded-lg">
                  <div className="grid">
                    <div className="-mt-4 col-start-1 row-start-1 flex max-h-[75dvh] flex-col pr-4">
                      {hasFailures && (
                        <AssignmentLoadError
                          {...loadErrorProps}
                          className="mt-4"
                          presentation={
                            loadErrorProps.isRateLimited ? "inline" : "empty"
                          }
                        />
                      )}
                      {renderList()}
                    </div>
                    {/* Holds the final empty-state height only while all
                        visible rows are exiting, avoiding a jump afterward. */}
                    {!hasFailures &&
                      listItems.length > 0 &&
                      listItems.every(({ assignment }) =>
                        exitingAssignmentIds.has(assignment.id)
                      ) && (
                        <div
                          aria-hidden="true"
                          className="invisible col-start-1 row-start-1 pr-4"
                        >
                          <NoAssignments />
                        </div>
                      )}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="calendar">
                <div className="flex h-[75dvh] flex-col gap-4">
                  {hasFailures && (
                    <AssignmentLoadError
                      {...loadErrorProps}
                      presentation="inline"
                    />
                  )}
                  {renderCalendar()}
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="-mx-6 -mb-6 flex-row items-center justify-start gap-2 px-4 py-2 sm:justify-start">
              {hasStaleData ? <AssignmentStaleWarning /> : <DialogTips />}
            </DialogFooter>
          </ManualDueDateProvider>
        </DialogContent>
      </Dialog>
    </div>
  );
}
