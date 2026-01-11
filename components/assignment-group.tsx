import { i18n } from "#i18n";
import { Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type GroupOption = "class" | "dueDate";

export interface GroupState {
  groupBy: GroupOption;
}

interface AssignmentGroupProps {
  groupState: GroupState;
  onGroupChange: (groupState: GroupState) => void;
}

export function AssignmentGroup({
  groupState,
  onGroupChange,
}: AssignmentGroupProps) {
  const groupOptions: { value: GroupOption; label: string }[] = [
    { value: "class", label: i18n.t("group_by_class") },
    { value: "dueDate", label: i18n.t("group_by_due_date") },
  ];

  const handleGroupChange = (value: GroupOption) => {
    onGroupChange({
      groupBy: value,
    });
  };

  const getGroupLabel = () => {
    const option = groupOptions.find((opt) => opt.value === groupState.groupBy);
    return option?.label || i18n.t("group_by");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Layers />
          {getGroupLabel()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{i18n.t("group_by")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={groupState.groupBy}
          onValueChange={(value) => handleGroupChange(value as GroupOption)}
        >
          {groupOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
