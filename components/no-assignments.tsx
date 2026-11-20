import { PartyPopper } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";

export function NoAssignments({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <Empty className={cn("animate-in fade-in-0 duration-300", className)}>
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
