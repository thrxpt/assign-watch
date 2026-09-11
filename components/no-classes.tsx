import { GraduationCap } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";

export function NoClasses() {
  const { t } = useI18n();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia
          className="size-9 [&_svg:not([class*='size-'])]:size-5"
          variant="icon"
        >
          <GraduationCap />
        </EmptyMedia>
        <EmptyTitle>{t("no_classes")}</EmptyTitle>
        <EmptyDescription>{t("no_classes_desc")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <a
          className={cn(buttonVariants({ size: "sm" }))}
          href="https://app.leb2.org/class"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("go_to_classes")}
        </a>
      </EmptyContent>
    </Empty>
  );
}
