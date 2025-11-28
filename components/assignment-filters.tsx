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
  const [open, setOpen] = useState(false);

  const updateFilter = (
    category: keyof FilterState,
    key: string,
    value: boolean,
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Filter />
          ตัวกรอง
          {activeFilterCount > 0 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>สถานะการส่ง</DropdownMenuLabel>
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
            ส่งแล้ว
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
            ยังไม่ได้ส่ง
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>ประเภทงาน</DropdownMenuLabel>
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
            การบ้าน
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
            แบบทดสอบ
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>ประเภทกลุ่ม</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={filters.groupType.individual}
            onCheckedChange={(checked) =>
              updateFilter("groupType", "individual", !!checked)
            }
            className={cn(
              isOnlyChecked("groupType", "individual") && "pointer-events-none",
            )}
          >
            งานเดี่ยว
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
            งานกลุ่ม
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
