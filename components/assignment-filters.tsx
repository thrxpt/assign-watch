import { useState } from "react";
import { Filter } from "lucide-react";

import { cn } from "@/lib/utils";
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

export type FilterState = {
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
};

interface AssignmentFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function AssignmentFilters({
  filters,
  onFiltersChange,
}: AssignmentFiltersProps) {
  const [open, setOpen] = useState(false);

  const updateFilter = (
    category: keyof FilterState,
    key: string,
    value: boolean,
  ) => {
    const categoryFilters = filters[category] as Record<string, boolean>;
    const otherKeys = Object.keys(categoryFilters).filter((k) => k !== key);

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
    return (
      categoryFilters[key] &&
      Object.keys(categoryFilters)
        .filter((k) => k !== key)
        .every((k) => !categoryFilters[k])
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Filter />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground inline-flex size-5 items-center justify-center rounded-full text-xs tabular-nums">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Submission Status</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={filters.submissionStatus.submitted}
            onCheckedChange={(checked) =>
              updateFilter("submissionStatus", "submitted", !!checked)
            }
            className={cn(
              isOnlyChecked("submissionStatus", "submitted") &&
                "pointer-events-none",
            )}
          >
            Submitted
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filters.submissionStatus.notSubmitted}
            onCheckedChange={(checked) =>
              updateFilter("submissionStatus", "notSubmitted", !!checked)
            }
            className={cn(
              isOnlyChecked("submissionStatus", "notSubmitted") &&
                "pointer-events-none",
            )}
          >
            Not Submitted
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Assignment Type</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={filters.assignmentType.assignment}
            onCheckedChange={(checked) =>
              updateFilter("assignmentType", "assignment", !!checked)
            }
            className={cn(
              isOnlyChecked("assignmentType", "assignment") &&
                "pointer-events-none",
            )}
          >
            Assignment
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filters.assignmentType.quiz}
            onCheckedChange={(checked) =>
              updateFilter("assignmentType", "quiz", !!checked)
            }
            className={cn(
              isOnlyChecked("assignmentType", "quiz") && "pointer-events-none",
            )}
          >
            Quiz
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Group Type</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={filters.groupType.individual}
            onCheckedChange={(checked) =>
              updateFilter("groupType", "individual", !!checked)
            }
            className={cn(
              isOnlyChecked("groupType", "individual") && "pointer-events-none",
            )}
          >
            Individual
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filters.groupType.group}
            onCheckedChange={(checked) =>
              updateFilter("groupType", "group", !!checked)
            }
            className={cn(
              isOnlyChecked("groupType", "group") && "pointer-events-none",
            )}
          >
            Group
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
