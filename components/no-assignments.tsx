import { FilterX, PartyPopper } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";

export type EmptyReason = "empty" | "filtered";

const EMPTY_STATE_COPY: Record<
  EmptyReason,
  { description: TranslationKey; title: TranslationKey }
> = {
  empty: {
    description: "no_assignments_description",
    title: "no_assignments",
  },
  filtered: {
    description: "no_matching_assignments_description",
    title: "no_matching_assignments",
  },
};

export function NoAssignments({
  className,
  reason = "empty",
}: {
  className?: string;
  reason?: EmptyReason;
}) {
  const { t } = useI18n();
  const copy = EMPTY_STATE_COPY[reason];

  return (
    <Empty className={cn("animate-in fade-in-0 duration-300", className)}>
      <EmptyHeader>
        <EmptyMedia
          className="size-9 [&_svg:not([class*='size-'])]:size-5"
          variant="icon"
        >
          {reason === "filtered" ? <FilterX /> : <PartyPopper />}
        </EmptyMedia>
        <EmptyTitle>{t(copy.title)}</EmptyTitle>
        <EmptyDescription>{t(copy.description)}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
