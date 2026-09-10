import { Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GroupOption, GroupState } from "@/lib/preferences";
import { useI18n } from "@/lib/use-i18n";

interface AssignmentGroupProps {
  groupState: GroupState;
  onGroupChange: (groupState: GroupState) => void;
}

export function AssignmentGroup({
  groupState,
  onGroupChange,
}: AssignmentGroupProps) {
  const { t } = useI18n();

  const groupOptions: { label: string; value: GroupOption }[] = [
    { label: t("group_by_class"), value: "class" },
    { label: t("group_by_due_date"), value: "dueDate" },
  ];

  const handleGroupChange = (value: GroupOption) => {
    onGroupChange({
      groupBy: value,
    });
  };

  const getGroupLabel = () => {
    const option = groupOptions.find((opt) => opt.value === groupState.groupBy);
    return option?.label || t("group_by");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="secondary">
            <Layers />
            {getGroupLabel()}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("group_by")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(value) => handleGroupChange(value as GroupOption)}
            value={groupState.groupBy}
          >
            {groupOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
