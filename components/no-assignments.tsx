import { PartyPopper } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useI18n } from "@/lib/use-i18n";

export function NoAssignments() {
  const { t } = useI18n();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia
          className="size-9 [&_svg:not([class*='size-'])]:size-5"
          variant="icon"
        >
          <PartyPopper />
        </EmptyMedia>
        <EmptyTitle>{t("no_assignments")}</EmptyTitle>
        <EmptyDescription>{t("no_assignments_desc")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
