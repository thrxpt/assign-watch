import { PartyPopper } from "lucide-react";
import { i18n } from "#imports";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function NoAssignments() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia
          className="size-9 [&_svg:not([class*='size-'])]:size-5"
          variant="icon"
        >
          <PartyPopper />
        </EmptyMedia>
        <EmptyTitle>{i18n.t("no_assignments")}</EmptyTitle>
        <EmptyDescription>{i18n.t("no_assignments_desc")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
