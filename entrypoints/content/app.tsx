import { useQueries } from "@tanstack/react-query";
import { Calendar, LayoutList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { i18n } from "#i18n";
import {
  AssignmentFilters,
  type FilterState,
} from "@/components/assignment-filters";
import {
  AssignmentGroup,
  type GroupState,
} from "@/components/assignment-group";
import { AssignmentSort, type SortState } from "@/components/assignment-sort";
import { CalendarView } from "@/components/calendar-view";
import { Class } from "@/components/class";
import { ClassSkeleton } from "@/components/class-skeleton";
import { DateGroup } from "@/components/date-group";
import { HiddenItemsManager } from "@/components/hidden-items-manager";
import { NoAssignments } from "@/components/no-assignments";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  classInfoStorage,
  filtersStorage,
  getAllClassInfo,
  getAssignments,
  getSubmissionStatus,
  getUserId,
  groupStorage,
  hiddenAssignmentsStorage,
  hiddenClassesStorage,
  sortStorage,
  userIdStorage,
} from "@/lib/utils";
import type { Activity } from "@/types";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hiddenClasses, setHiddenClasses] = useState<number[]>([]);
  const [hiddenAssignments, setHiddenAssignments] = useState<number[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    submissionStatus: {
      submitted: true,
      notSubmitted: true,
    },
    assignmentType: {
      assignment: true,
      quiz: true,
    },
    groupType: {
      individual: true,
      group: true,
    },
  });
  const [sortState, setSortState] = useState<SortState>({
    sortBy: "dueDate",
    direction: "asc",
  });
  const [groupState, setGroupState] = useState<GroupState>({
    groupBy: "class",
  });

  useEffect(() => {
    const shouldOpenDialog =
      window.location.pathname === "/class" &&
      sessionStorage.getItem("shouldOpenDialog") === "true";

    if (shouldOpenDialog) {
      setIsModalOpen(true);
      sessionStorage.removeItem("shouldOpenDialog");
    }
  }, []);

  useEffect(() => {
    const loadStorageData = async () => {
      const [classes, assignments, storedFilters, storedSort, storedGroup] =
        await Promise.all([
          hiddenClassesStorage.getValue(),
          hiddenAssignmentsStorage.getValue(),
          filtersStorage.getValue(),
          sortStorage.getValue(),
          groupStorage.getValue(),
        ]);
      setHiddenClasses(classes ?? []);
      setHiddenAssignments(assignments ?? []);
      if (storedFilters) {
        setFilters(storedFilters);
      }
      if (storedSort) {
        setSortState(storedSort);
      }
      if (storedGroup) {
        setGroupState(storedGroup);
      }
    };
    loadStorageData();

    const unwatchClasses = hiddenClassesStorage.watch(
      (newValue: number[] | undefined) => {
        setHiddenClasses(newValue ?? []);
      }
    );

    const unwatchAssignments = hiddenAssignmentsStorage.watch(
      (newValue: number[] | undefined) => {
        setHiddenAssignments(newValue ?? []);
      }
    );

    const unwatchFilters = filtersStorage.watch(
      (newValue: FilterState | undefined) => {
        if (newValue) {
          setFilters(newValue);
        }
      }
    );

    const unwatchSort = sortStorage.watch((newValue: SortState | undefined) => {
      if (newValue) {
        setSortState(newValue);
      }
    });

    const unwatchGroup = groupStorage.watch(
      (newValue: GroupState | undefined) => {
        if (newValue) {
          setGroupState(newValue);
        }
      }
    );

    return () => {
      unwatchClasses();
      unwatchAssignments();
      unwatchFilters();
      unwatchSort();
      unwatchGroup();
    };
  }, []);

  useEffect(() => {
    let button: HTMLButtonElement | null = null;
    const targetElement = document.querySelector(
      ".nav.navbar-nav.page-menu.flex-container.fxf-rnw"
    );
    if (targetElement) {
      button = document.createElement("button");
      button.textContent = "Assignments ✨";
      button.className = "nav-link header-link";
      button.style.border = "none";
      button.style.background = "transparent";
      button.onclick = () => {
        if (window.location.pathname !== "/class") {
          sessionStorage.setItem("shouldOpenDialog", "true");
          window.location.href = "/class";
        } else {
          setIsModalOpen(true);
        }
      };
      targetElement.appendChild(button);
    }
    return () => {
      if (button?.parentNode) {
        button.parentNode.removeChild(button);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyA") {
        e.preventDefault();
        if (window.location.pathname !== "/class") {
          sessionStorage.setItem("shouldOpenDialog", "true");
          window.location.href = "/class";
        } else {
          setIsModalOpen((prev) => !prev);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const allClassInfo = useMemo(() => getAllClassInfo(), []);

  useEffect(() => {
    const saveInfo = async () => {
      const userId = getUserId();
      if (userId) {
        await userIdStorage.setValue(userId);
      }
      await classInfoStorage.setValue(allClassInfo);
    };
    saveInfo();
  }, [allClassInfo]);

  const assignments = useQueries({
    queries: allClassInfo.map((classInfo) => ({
      queryKey: ["assignments", classInfo.id],
      queryFn: () => getAssignments(classInfo.id),
    })),
    combine: (results) => {
      return {
        data: results.map((result) => result.data),
        pending: results.some((result) => result.isPending),
      };
    },
  });

  const handleFiltersChange = async (newFilters: FilterState) => {
    setFilters(newFilters);
    await filtersStorage.setValue(newFilters);
  };

  const handleSortChange = async (newSort: SortState) => {
    setSortState(newSort);
    await sortStorage.setValue(newSort);
  };

  const handleGroupChange = async (newGroup: GroupState) => {
    setGroupState(newGroup);
    await groupStorage.setValue(newGroup);
  };

  const sortAssignments = (assignments: Activity[]) => {
    const sorted = [...assignments].sort((a, b) => {
      let comparison = 0;

      switch (sortState.sortBy) {
        case "dueDate":
          comparison =
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case "postedDate":
          comparison =
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          break;
        default:
          break;
      }

      return sortState.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  };

  const applyFilters = (assignment: Activity) => {
    const status = getSubmissionStatus(assignment);

    if (
      (status === "submitted" || status === "submitted_late") &&
      !filters.submissionStatus.submitted
    ) {
      return false;
    }
    if (
      (status === "not_submitted" ||
        status === "in_progress" ||
        status === "quiz_not_submitted") &&
      !filters.submissionStatus.notSubmitted
    ) {
      return false;
    }

    const isAssignment = assignment.type === "ASM";
    if (isAssignment && !filters.assignmentType.assignment) {
      return false;
    }
    if (!(isAssignment || filters.assignmentType.quiz)) {
      return false;
    }

    const isIndividual = assignment.group_type === "IND";
    if (isIndividual && !filters.groupType.individual) {
      return false;
    }
    if (!(isIndividual || filters.groupType.group)) {
      return false;
    }

    return true;
  };

  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");

  return (
    <div>
      <Dialog onOpenChange={setIsModalOpen} open={isModalOpen}>
        <DialogContent
          className="rounded-xl sm:max-w-3xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
          showCloseButton={false}
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
                {activeTab === "list" ? i18n.t("todo") : i18n.t("calendar")}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <HiddenItemsManager
                  allAssignments={assignments.data}
                  allClassInfo={allClassInfo}
                  hiddenAssignments={hiddenAssignments}
                  hiddenClasses={hiddenClasses}
                />
                <AssignmentSort
                  onSortChange={handleSortChange}
                  sortState={sortState}
                />
                <AssignmentFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
                {activeTab === "list" && (
                  <AssignmentGroup
                    groupState={groupState}
                    onGroupChange={handleGroupChange}
                  />
                )}
                <TabsList className="h-8">
                  <TabsTrigger value="list">
                    <LayoutList />
                    <span className="sr-only">{i18n.t("list_view")}</span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar">
                    <Calendar />
                    <span className="sr-only">{i18n.t("calendar_view")}</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </DialogHeader>
            <TabsContent value="list">
              <ScrollArea className="rounded-lg">
                <div className="max-h-[75dvh] space-y-5 pr-4">
                  {(() => {
                    // Handle loading state
                    if (assignments.pending) {
                      return Array.from({ length: 4 }).map((_, index) => (
                        <ClassSkeleton key={index} />
                      ));
                    }

                    // Collect all filtered and sorted assignments
                    const allFilteredAssignments: {
                      assignment: Activity;
                      classInfo: (typeof allClassInfo)[0];
                    }[] = [];

                    assignments.data.forEach((query, index) => {
                      const classInfo = allClassInfo[index];

                      if (hiddenClasses.includes(classInfo.id)) {
                        return;
                      }

                      if (!query || query.length === 0) {
                        return;
                      }

                      const submittedAssignments = query.filter(
                        (assignment) => {
                          const status = getSubmissionStatus(assignment);
                          return (
                            status === "submitted" ||
                            status === "submitted_late"
                          );
                        }
                      );

                      const exceededAssignments = query.filter(
                        (assignment) => assignment.due_date_exceed
                      );

                      const filteredAssignments = query
                        .filter(
                          (assignment) =>
                            !(
                              exceededAssignments.includes(assignment) &&
                              submittedAssignments.includes(assignment)
                            )
                        )
                        .filter(
                          (assignment) =>
                            !hiddenAssignments.includes(assignment.id)
                        )
                        .filter(applyFilters);

                      for (const assignment of filteredAssignments) {
                        allFilteredAssignments.push({
                          assignment,
                          classInfo,
                        });
                      }
                    });

                    if (allFilteredAssignments.length === 0) {
                      return <NoAssignments />;
                    }

                    // Group by class
                    if (groupState.groupBy === "class") {
                      const classGroups = new Map<
                        number,
                        {
                          classInfo: (typeof allClassInfo)[0];
                          assignments: Activity[];
                        }
                      >();

                      for (const {
                        assignment,
                        classInfo,
                      } of allFilteredAssignments) {
                        if (!classGroups.has(classInfo.id)) {
                          classGroups.set(classInfo.id, {
                            classInfo,
                            assignments: [],
                          });
                        }
                        classGroups
                          .get(classInfo.id)
                          ?.assignments.push(assignment);
                      }

                      return Array.from(classGroups.values()).map((group) => (
                        <Class
                          assignments={sortAssignments(group.assignments)}
                          classInfo={group.classInfo}
                          key={group.classInfo.id}
                        />
                      ));
                    }

                    // Group by due date
                    const dateGroups = new Map<string, Activity[]>();
                    const classInfoMap = new Map(
                      allClassInfo.map((c) => [c.id, c])
                    );

                    // Sort all assignments first
                    const sortedAssignments = sortAssignments(
                      allFilteredAssignments.map((item) => item.assignment)
                    );

                    for (const assignment of sortedAssignments) {
                      const dateKey = new Date(assignment.due_date)
                        .toISOString()
                        .split("T")[0];
                      if (!dateGroups.has(dateKey)) {
                        dateGroups.set(dateKey, []);
                      }
                      dateGroups.get(dateKey)?.push(assignment);
                    }

                    // Sort date groups by date
                    const sortedDateGroups = Array.from(
                      dateGroups.entries()
                    ).sort(([a], [b]) => {
                      const comparison =
                        new Date(a).getTime() - new Date(b).getTime();
                      return sortState.direction === "asc"
                        ? comparison
                        : -comparison;
                    });

                    return sortedDateGroups.map(([date, dateAssignments]) => (
                      <DateGroup
                        assignments={dateAssignments}
                        classInfoMap={classInfoMap}
                        date={date}
                        key={date}
                      />
                    ));
                  })()}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="calendar">
              <div className="h-[75dvh]">
                <CalendarView
                  allAssignments={assignments.data}
                  allClassInfo={allClassInfo}
                  applyFilters={applyFilters}
                  hiddenAssignments={hiddenAssignments}
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
