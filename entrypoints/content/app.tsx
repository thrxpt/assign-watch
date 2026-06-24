import { useQueries } from "@tanstack/react-query";
import { Calendar, LayoutList } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { i18n } from "#i18n";
import { AssignmentFilters } from "@/components/assignment-filters";
import { AssignmentGroup } from "@/components/assignment-group";
import { AssignmentSort } from "@/components/assignment-sort";
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
import { fetchAssignments } from "@/lib/api";
import { scrapeClassCards, scrapeUserId } from "@/lib/dom";
import {
  collectAssignments,
  groupByClass,
  groupByDueDate,
  passesFilters,
} from "@/lib/group-assignments";
import {
  classInfoStorage,
  filtersStorage,
  groupStorage,
  hiddenAssignmentsStorage,
  hiddenClassesStorage,
  sortStorage,
  userIdStorage,
} from "@/lib/storage";
import { useStorageState } from "@/lib/use-storage-state";
import type { Activity } from "@/types";

function navigateToClassPage() {
  sessionStorage.setItem("shouldOpenDialog", "true");
  window.location.href = "/class";
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");

  const [hiddenClasses] = useStorageState(hiddenClassesStorage);
  const [hiddenAssignments] = useStorageState(hiddenAssignmentsStorage);
  const [filters, setFilters] = useStorageState(filtersStorage);
  const [sortState, setSortState] = useStorageState(sortStorage);
  const [groupState, setGroupState] = useStorageState(groupStorage);

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
        if (window.location.pathname === "/class") {
          setIsModalOpen(true);
        } else {
          navigateToClassPage();
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
        if (window.location.pathname === "/class") {
          setIsModalOpen((prev) => !prev);
        } else {
          navigateToClassPage();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const allClassInfo = useMemo(() => scrapeClassCards(), []);

  useEffect(() => {
    const saveInfo = async () => {
      const userId = scrapeUserId();
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
      queryFn: () => fetchAssignments(classInfo.id),
    })),
    combine: (results) => ({
      data: results.map((result) => result.data),
      pending: results.some((result) => result.isPending),
    }),
  });

  const applyFilters = useCallback(
    (assignment: Activity) => passesFilters(assignment, filters),
    [filters]
  );

  const renderList = () => {
    if (assignments.pending) {
      return Array.from({ length: 4 }).map((_, index) => (
        <ClassSkeleton key={index} />
      ));
    }

    const items = collectAssignments({
      data: assignments.data,
      allClassInfo,
      hiddenClasses,
      hiddenAssignments,
      filters,
    });

    if (items.length === 0) {
      return <NoAssignments />;
    }

    if (groupState.groupBy === "class") {
      return groupByClass(items, sortState).map((group) => (
        <Class
          assignments={group.assignments}
          classInfo={group.classInfo}
          key={group.classInfo.id}
        />
      ));
    }

    const classInfoMap = new Map(allClassInfo.map((c) => [c.id, c]));
    return groupByDueDate(items, sortState).map(
      ({ date, assignments: due }) => (
        <DateGroup
          assignments={due}
          classInfoMap={classInfoMap}
          date={date}
          key={date}
        />
      )
    );
  };

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
                  onSortChange={setSortState}
                  sortState={sortState}
                />
                <AssignmentFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                />
                {activeTab === "list" && (
                  <AssignmentGroup
                    groupState={groupState}
                    onGroupChange={setGroupState}
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
                <div className="max-h-[75dvh] space-y-4 pr-4">
                  {renderList()}
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
