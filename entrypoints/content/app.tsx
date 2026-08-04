import { useQueries } from "@tanstack/react-query";
import { Calendar, LayoutList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { i18n } from "#imports";
import { AssignmentFilters } from "@/components/assignment-filters";
import { AssignmentGroup } from "@/components/assignment-group";
import { AssignmentSort } from "@/components/assignment-sort";
import { CalendarView } from "@/components/calendar-view";
import { Class } from "@/components/class";
import { ClassSkeleton } from "@/components/class-skeleton";
import { DateGroup } from "@/components/date-group";
import { DialogTips } from "@/components/dialog-tips";
import { HiddenItemsManager } from "@/components/hidden-items-manager";
import { NoAssignments } from "@/components/no-assignments";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAssignments } from "@/lib/api";
import { scrapeClassCards, scrapeUserId } from "@/lib/dom";
import { groupByClass, groupByDueDate } from "@/lib/group-assignments";
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
import { visibleAssignments } from "@/lib/visible-assignments";

function navigateToClassPage() {
  sessionStorage.setItem("shouldOpenDialog", "true");
  window.location.href = "/class";
}

function shouldOpenDialogOnMount() {
  return (
    window.location.pathname === "/class" &&
    sessionStorage.getItem("shouldOpenDialog") === "true"
  );
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(shouldOpenDialogOnMount);
  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");

  const [hiddenClasses] = useStorageState(hiddenClassesStorage);
  const [hiddenAssignments] = useStorageState(hiddenAssignmentsStorage);
  const [filters, setFilters] = useStorageState(filtersStorage);
  const [sortState, setSortState] = useStorageState(sortStorage);
  const [groupState, setGroupState] = useStorageState(groupStorage);

  useEffect(() => {
    sessionStorage.removeItem("shouldOpenDialog");
  }, []);

  useEffect(() => {
    const button = document.createElement("button");
    button.textContent = "Assignments ✨";
    button.className = "nav-link header-link";
    button.style.border = "none";
    button.style.background = "transparent";

    const handleClick = () => {
      if (window.location.pathname === "/class") {
        setIsModalOpen(true);
      } else {
        navigateToClassPage();
      }
    };
    button.addEventListener("click", handleClick);

    document
      .querySelector(".nav.navbar-nav.page-menu.flex-container.fxf-rnw")
      ?.append(button);

    return () => {
      button.removeEventListener("click", handleClick);
      button.remove();
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
    combine: (results) => ({
      data: results.map((result) => result.data),
      pending: results.some((result) => result.isPending),
    }),
    queries: allClassInfo.map((classInfo) => ({
      queryFn: () => fetchAssignments(classInfo.id),
      queryKey: ["assignments", classInfo.id],
    })),
  });

  const visibility = {
    allClassInfo,
    data: assignments.data,
    filters,
    hiddenAssignments,
    hiddenClasses,
  };

  const listItems = visibleAssignments({
    ...visibility,
    includeSettled: false,
  });
  const calendarItems = visibleAssignments({
    ...visibility,
    includeSettled: true,
  });

  const renderList = () => {
    if (assignments.pending) {
      return Array.from({ length: 4 }).map((_, index) => (
        <ClassSkeleton key={index} />
      ));
    }

    if (listItems.length === 0) {
      return <NoAssignments />;
    }

    if (groupState.groupBy === "class") {
      return groupByClass(listItems, sortState).map((group) => (
        <Class
          assignments={group.assignments}
          classInfo={group.classInfo}
          key={group.classInfo.id}
        />
      ));
    }

    const classInfoMap = new Map(allClassInfo.map((c) => [c.id, c]));
    return groupByDueDate(listItems, sortState).map(
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
          className="p-6 sm:max-w-3xl"
          initialFocus={false}
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
                <CalendarView assignments={calendarItems} />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="-mx-6 -mb-6 flex-row items-center justify-start gap-2 px-4 py-2 sm:justify-start">
            <DialogTips />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
