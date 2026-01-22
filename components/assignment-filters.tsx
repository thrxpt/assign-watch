import { Filter } from "lucide-react";
import { i18n } from "#i18n";
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
import { cn } from "@/lib/utils";

export interface FilterState {
  submissionStatus: {
    submitted: boolean;
    notSubmitted: boolean;
  };
  assignmentType: {
    assignment: boolean;
    quiz: boolean;
  };
  groupType: {
    individual: boolean;
    group: boolean;
  };
}

const VALID_KEYS: Record<keyof FilterState, string[]> = {
  submissionStatus: ["submitted", "notSubmitted"],
  assignmentType: ["assignment", "quiz"],
  groupType: ["individual", "group"],
};

interface AssignmentFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function AssignmentFilters({
  filters,
  onFiltersChange,
}: AssignmentFiltersProps) {
  const updateFilter = (
    category: keyof FilterState,
    key: string,
    value: boolean
  ) => {
    const categoryFilters = filters[category] as Record<string, boolean>;
    const validKeys = VALID_KEYS[category];
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

  const isOnlyChecked = (category: keyof FilterState, key: string) => {
    const categoryFilters = filters[category] as Record<string, boolean>;
    const validKeys = VALID_KEYS[category];
    return (
      categoryFilters[key] &&
      validKeys.filter((k) => k !== key).every((k) => !categoryFilters[k])
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary">
          <Filter />
          {i18n.t("filter")}
          {activeFilterCount > 0 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs tabular-nums">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{i18n.t("submission_status")}</DropdownMenuLabel>
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
            {i18n.t("submitted")}
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
            {i18n.t("not_submitted")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>{i18n.t("assignment_type")}</DropdownMenuLabel>
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
            {i18n.t("assignment")}
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
            {i18n.t("quiz")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>{i18n.t("group_type")}</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={filters.groupType.individual}
            className={cn(
              isOnlyChecked("groupType", "individual") && "pointer-events-none"
            )}
            onCheckedChange={(checked) =>
              updateFilter("groupType", "individual", !!checked)
            }
          >
            {i18n.t("individual")}
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
            {i18n.t("group")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
