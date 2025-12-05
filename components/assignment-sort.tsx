import { i18n } from "#i18n";
import { ArrowDownUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortOption = "postedDate" | "dueDate";

export type SortDirection = "asc" | "desc";

export interface SortState {
  sortBy: SortOption;
  direction: SortDirection;
}

interface AssignmentSortProps {
  sortState: SortState;
  onSortChange: (sortState: SortState) => void;
}

export function AssignmentSort({
  sortState,
  onSortChange,
}: AssignmentSortProps) {
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "dueDate", label: i18n.t("due_date") },
    { value: "postedDate", label: i18n.t("posted_date") },
  ];

  const handleSortChange = (value: SortOption) => {
    onSortChange({
      ...sortState,
      sortBy: value,
    });
  };

  const handleDirectionChange = (value: SortDirection) => {
    onSortChange({
      ...sortState,
      direction: value,
    });
  };

  const getSortLabel = () => {
    const option = sortOptions.find((opt) => opt.value === sortState.sortBy);
    return option?.label || i18n.t("sort");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <ArrowDownUp />
          {getSortLabel()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{i18n.t("sort_by")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortState.sortBy}
            onValueChange={(value) => handleSortChange(value as SortOption)}
          >
            {sortOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>{i18n.t("order")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortState.direction}
            onValueChange={(value) =>
              handleDirectionChange(value as SortDirection)
            }
          >
            <DropdownMenuRadioItem value="asc">
              {i18n.t("asc")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">
              {i18n.t("desc")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
