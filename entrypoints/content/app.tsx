import { useQueries } from "@tanstack/react-query";
import { Calendar, LayoutList, Settings } from "lucide-react";
import { useEffect, useState } from "react";

import { browser } from "#imports";
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
import { useI18n } from "@/lib/use-i18n";
import { useStorageState } from "@/lib/use-storage-state";
import { visibleAssignments } from "@/lib/visible-assignments";

async function openOptionsPage() {
  if (typeof browser?.runtime?.openOptionsPage === "function") {
    try {
      await browser.runtime.openOptionsPage();
      return;
    } catch {
      // Fall through to message passing fallback
    }
  }

  try {
    await browser.runtime.sendMessage({ action: "openOptionsPage" });
  } catch {
    // Suppress unhandled rejection if receiver or background worker is unavailable
  }
}

function App() {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");

  const [allClassInfo] = useStorageState(classInfoStorage);
  const [userId] = useStorageState(userIdStorage);
  const [hiddenClasses] = useStorageState(hiddenClassesStorage);
  const [hiddenAssignments] = useStorageState(hiddenAssignmentsStorage);
  const [filters, setFilters] = useStorageState(filtersStorage);
  const [sortState, setSortState] = useStorageState(sortStorage);
  const [groupState, setGroupState] = useStorageState(groupStorage);

  useEffect(() => {
    const syncInfo = async () => {
      const userIdFromDom = scrapeUserId();
      if (userIdFromDom) {
        await userIdStorage.setValue(userIdFromDom);
      }

      if (window.location.pathname === "/class") {
        const scraped = scrapeClassCards();
        if (scraped.length > 0) {
          await classInfoStorage.setValue(scraped);
        }
      }
    };

    void syncInfo();
  }, []);

  useEffect(() => {
    const button = document.createElement("button");
    button.textContent = "Assignments ✨";
    button.className = "nav-link header-link";
    button.style.border = "none";
    button.style.background = "transparent";

    const handleClick = () => {
      setIsModalOpen(true);
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
        setIsModalOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const assignments = useQueries({
    combine: (results) => ({
      data: results.map((result) => result.data),
      pending: results.some((result) => result.isPending),
    }),
    queries: allClassInfo.map((classInfo) => ({
      queryFn: () => fetchAssignments(classInfo.id, userId),
      queryKey: ["assignments", classInfo.id, userId],
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
    if (allClassInfo.length === 0) {
      return <NoClasses />;
    }

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
                {activeTab === "list" ? t("todo") : t("calendar")}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={openOptionsPage}
                  size="icon"
                  title={t("settings")}
                  variant="secondary"
                >
                  <Settings />
                  <span className="sr-only">{t("settings")}</span>
                </Button>
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
                <div className="max-h-[75dvh] space-y-4 pr-4">
                  {renderList()}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="calendar">
              <div className="h-[75dvh]">
                {allClassInfo.length === 0 ? (
                  <NoClasses />
                ) : (
                  <CalendarView assignments={calendarItems} />
                )}
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
