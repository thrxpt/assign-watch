import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILTER_KEYS } from "@/lib/preferences";
import type { FilterState } from "@/lib/preferences";
import { useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";

interface AssignmentFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function AssignmentFilters({
  filters,
  onFiltersChange,
}: AssignmentFiltersProps) {
  const { t } = useI18n();
  const updateFilter = <T extends keyof FilterState>(
    category: T,
    key: keyof FilterState[T],
    value: boolean
  ) => {
    const categoryFilters = filters[category];
    const validKeys = FILTER_KEYS[category];
    const otherKeys = validKeys.filter((k) => k !== key);

    if (!value && otherKeys.every((k) => !categoryFilters[k])) {
      return;
    }

    onFiltersChange({
      ...filters,
      [category]: {
        ...filters[category],
        [key]: value,
      },
    });
  };

  const activeFilterCount = [
    ...Object.values(filters.submissionStatus),
    ...Object.values(filters.assignmentType),
    ...Object.values(filters.groupType),
  ].filter((v) => !v).length;

  const isOnlyChecked = <T extends keyof FilterState>(
    category: T,
    key: keyof FilterState[T]
  ) => {
    const categoryFilters = filters[category];
    const validKeys = FILTER_KEYS[category];
    return (
      categoryFilters[key] &&
      validKeys.filter((k) => k !== key).every((k) => !categoryFilters[k])
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="secondary">
            <Filter />
            {t("filter")}
            {activeFilterCount > 0 && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("submission_status")}</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={filters.submissionStatus.submitted}
            className={cn(
              isOnlyChecked("submissionStatus", "submitted") &&
                "pointer-events-none"
            )}
            onCheckedChange={(checked) =>
              updateFilter("submissionStatus", "submitted", !!checked)
            }
          >
            {t("submitted")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filters.submissionStatus.notSubmitted}
            className={cn(
              isOnlyChecked("submissionStatus", "notSubmitted") &&
                "pointer-events-none"
            )}
            onCheckedChange={(checked) =>
              updateFilter("submissionStatus", "notSubmitted", !!checked)
            }
          >
            {t("not_submitted")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("assignment_type")}</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={filters.assignmentType.assignment}
            className={cn(
              isOnlyChecked("assignmentType", "assignment") &&
                "pointer-events-none"
            )}
            onCheckedChange={(checked) =>
              updateFilter("assignmentType", "assignment", !!checked)
            }
          >
            {t("assignment")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filters.assignmentType.quiz}
            className={cn(
              isOnlyChecked("assignmentType", "quiz") && "pointer-events-none"
            )}
            onCheckedChange={(checked) =>
              updateFilter("assignmentType", "quiz", !!checked)
            }
          >
            {t("quiz")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("group_type")}</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={filters.groupType.individual}
            className={cn(
              isOnlyChecked("groupType", "individual") && "pointer-events-none"
            )}
            onCheckedChange={(checked) =>
              updateFilter("groupType", "individual", !!checked)
            }
          >
            {t("individual")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filters.groupType.group}
            className={cn(
              isOnlyChecked("groupType", "group") && "pointer-events-none"
            )}
            onCheckedChange={(checked) =>
              updateFilter("groupType", "group", !!checked)
            }
          >
            {t("group")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
