import { useEffect, useMemo, useState } from "react";
import { Activity } from "@/types";
import { useQueries } from "@tanstack/react-query";
import { i18n } from "#i18n";
import { Calendar, LayoutList } from "lucide-react";

import {
  classInfoStorage,
  filtersStorage,
  getAllClassInfo,
  getAssignments,
  getSubmissionStatus,
  getUserId,
  hiddenAssignmentsStorage,
  hiddenClassesStorage,
  sortStorage,
  userIdStorage,
} from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AssignmentFilters,
  FilterState,
} from "@/components/assignment-filters";
import { AssignmentSort } from "@/components/assignment-sort";
import { CalendarView } from "@/components/calendar-view";
import { Class } from "@/components/class";
import { ClassSkeleton } from "@/components/class-skeleton";
import { HiddenItemsManager } from "@/components/hidden-items-manager";
import { NoAssignments } from "@/components/no-assignments";

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
      const [classes, assignments, storedFilters, storedSort] =
        await Promise.all([
          hiddenClassesStorage.getValue(),
          hiddenAssignmentsStorage.getValue(),
          filtersStorage.getValue(),
          sortStorage.getValue(),
        ]);
      setHiddenClasses(classes ?? []);
      setHiddenAssignments(assignments ?? []);
      if (storedFilters) {
        setFilters(storedFilters);
      }
      if (storedSort) {
        setSortState(storedSort);
      }
    };
    loadStorageData();

    const unwatchClasses = hiddenClassesStorage.watch((newValue) => {
      setHiddenClasses(newValue ?? []);
    });

    const unwatchAssignments = hiddenAssignmentsStorage.watch((newValue) => {
      setHiddenAssignments(newValue ?? []);
    });

    const unwatchFilters = filtersStorage.watch((newValue) => {
      if (newValue) {
        setFilters(newValue);
      }
    });

    const unwatchSort = sortStorage.watch((newValue) => {
      if (newValue) {
        setSortState(newValue);
      }
    });

    return () => {
      unwatchClasses();
      unwatchAssignments();
      unwatchFilters();
      unwatchSort();
    };
  }, []);

  useEffect(() => {
    let button: HTMLButtonElement | null = null;
    const targetElement = document.querySelector(
      ".nav.navbar-nav.page-menu.flex-container.fxf-rnw",
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
      if (button && button.parentNode) {
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
  }, [isModalOpen]);

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
    )
      return false;
    if (
      (status === "not_submitted" ||
        status === "in_progress" ||
        status === "quiz_not_submitted") &&
      !filters.submissionStatus.notSubmitted
    )
      return false;

    const isAssignment = assignment.type === "ASM";
    if (isAssignment && !filters.assignmentType.assignment) return false;
    if (!isAssignment && !filters.assignmentType.quiz) return false;

    const isIndividual = assignment.group_type === "IND";
    if (isIndividual && !filters.groupType.individual) return false;
    if (!isIndividual && !filters.groupType.group) return false;

    return true;
  };

  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");

  return (
    <div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="rounded-xl sm:max-w-3xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Tabs
            defaultValue="list"
            className="gap-4"
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "list" | "calendar")
            }
          >
            <DialogHeader className="flex-row items-center justify-between">
              <DialogTitle className="text-xl">
                {activeTab === "list" ? i18n.t("todo") : i18n.t("calendar")}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <HiddenItemsManager
                  hiddenClasses={hiddenClasses}
                  hiddenAssignments={hiddenAssignments}
                  allClassInfo={allClassInfo}
                  allAssignments={assignments.data}
                />
                <AssignmentSort
                  sortState={sortState}
                  onSortChange={handleSortChange}
                />
                <AssignmentFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
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
                    const visibleClasses = assignments.data
                      .map((query, index) => {
                        if (assignments.pending) {
                          return { type: "skeleton" as const, index };
                        }

                        const classInfo = allClassInfo[index];

                        if (hiddenClasses.includes(classInfo.id)) {
                          return null;
                        }

                        if (!query || query.length === 0) {
                          return null;
                        }
                        const submittedAssignments = query.filter(
                          (assignment) => {
                            const status = getSubmissionStatus(assignment);
                            return (
                              status === "submitted" ||
                              status === "submitted_late"
                            );
                          },
                        );
                        const exceededAssignments = query.filter(
                          (assignment) => assignment.due_date_exceed,
                        );
                        const filteredAssignments = query
                          .filter(
                            (assignment) =>
                              !exceededAssignments.includes(assignment) ||
                              !submittedAssignments.includes(assignment),
                          )
                          .filter(
                            (assignment) =>
                              !hiddenAssignments.includes(assignment.id),
                          )
                          .filter(applyFilters);

                        const sortedAssignments =
                          sortAssignments(filteredAssignments);

                        if (sortedAssignments.length === 0) {
                          return null;
                        }

                        return {
                          type: "class" as const,
                          classInfo,
                          assignments: sortedAssignments,
                        };
                      })
                      .filter((item) => item !== null);

                    if (!assignments.pending && visibleClasses.length === 0) {
                      return <NoAssignments />;
                    }

                    return visibleClasses.map((item) => {
                      if (item.type === "skeleton") {
                        return <ClassSkeleton key={item.index} />;
                      }

                      return (
                        <Class
                          key={item.classInfo.id}
                          classInfo={item.classInfo}
                          assignments={item.assignments}
                        />
                      );
                    });
                  })()}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="calendar">
              <div className="h-[75dvh]">
                <CalendarView
                  allClassInfo={allClassInfo}
                  allAssignments={assignments.data}
                  hiddenAssignments={hiddenAssignments}
                  applyFilters={applyFilters}
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
