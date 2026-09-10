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
import type { SortDirection, SortOption, SortState } from "@/lib/preferences";
import { useI18n } from "@/lib/use-i18n";

interface AssignmentSortProps {
  onSortChange: (sortState: SortState) => void;
  sortState: SortState;
}

export function AssignmentSort({
  sortState,
  onSortChange,
}: AssignmentSortProps) {
  const { t } = useI18n();

  const sortOptions: { label: string; value: SortOption }[] = [
    { label: t("due_date"), value: "dueDate" },
    { label: t("posted_date"), value: "postedDate" },
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
    return option?.label || t("sort");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="secondary">
            <ArrowDownUp />
            {getSortLabel()}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("sort_by")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(value) => handleSortChange(value as SortOption)}
            value={sortState.sortBy}
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
          <DropdownMenuLabel>{t("order")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(value) =>
              handleDirectionChange(value as SortDirection)
            }
            value={sortState.direction}
          >
            <DropdownMenuRadioItem value="asc">
              {t("asc")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">
              {t("desc")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
