import { CircleAlert, Timer } from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useI18n } from "@/lib/use-i18n";

interface AssignmentLoadErrorProps {
  hasStaleData: boolean;
  isRateLimited: boolean;
  isRetrying: boolean;
  onRetry: () => Promise<void>;
  presentation?: "empty" | "inline";
}

export function AssignmentLoadError({
  hasStaleData,
  isRateLimited,
  isRetrying,
  onRetry,
  presentation = "empty",
}: AssignmentLoadErrorProps) {
  const { t } = useI18n();
  const title = t(
    isRateLimited ? "assignments_rate_limited" : "assignments_load_error"
  );
  const description = t(
    isRateLimited
      ? "assignments_rate_limited_desc"
      : "assignments_load_error_desc"
  );
  const retryButton = (
    <Button disabled={isRetrying} onClick={onRetry} size="sm" variant="outline">
      {t(isRetrying ? "retrying" : "try_again")}
    </Button>
  );

  if (presentation === "inline") {
    return (
      <Alert
        aria-atomic="true"
        aria-live="polite"
        className="shrink-0 has-data-[slot=alert-action]:pr-3 sm:has-data-[slot=alert-action]:pr-32"
      >
        {isRateLimited ? <Timer /> : <CircleAlert />}
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="text-xs">
          {description}
          {hasStaleData && <> {t("assignments_stale_warning")}</>}
        </AlertDescription>
        <AlertAction className="static col-start-2 mt-2 justify-self-start sm:absolute sm:mt-0">
          {retryButton}
        </AlertAction>
      </Alert>
    );
  }

  return (
    <Empty aria-atomic="true" aria-live="polite" className="flex-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isRateLimited ? <Timer /> : <CircleAlert />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
        {hasStaleData && (
          <EmptyDescription>{t("assignments_stale_warning")}</EmptyDescription>
        )}
      </EmptyHeader>
      <EmptyContent>{retryButton}</EmptyContent>
    </Empty>
  );
}
