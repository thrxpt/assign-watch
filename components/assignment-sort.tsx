import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "dueDate", label: "Due Date" },
    { value: "postedDate", label: "Posted Date" },
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
    return option?.label || "Sort";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <ArrowDownUp />
          {getSortLabel()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
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
          <DropdownMenuLabel>Direction</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortState.direction}
            onValueChange={(value) =>
              handleDirectionChange(value as SortDirection)
            }
          >
            <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">
              Descending
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
