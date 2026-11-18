import { CircleAlert, Timer } from "lucide-react";
import { useEffect, useState } from "react";

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
  isRateLimited: boolean;
  isRetrying: boolean;
  onRetry: () => Promise<void>;
  presentation?: "empty" | "inline";
  retryAt: number | null;
}

export function AssignmentLoadError({
  isRateLimited,
  isRetrying,
  onRetry,
  presentation = "empty",
  retryAt,
}: AssignmentLoadErrorProps) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (retryAt === null) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const updateCountdown = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime < retryAt) {
        timeoutId = setTimeout(
          updateCountdown,
          Math.min(1000, retryAt - currentTime)
        );
      }
    };

    timeoutId = setTimeout(updateCountdown, 0);
    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [retryAt]);

  const retryWaitSeconds =
    isRateLimited && retryAt !== null
      ? Math.max(0, Math.ceil((retryAt - now) / 1000))
      : 0;
  const isWaitingForRetry = retryWaitSeconds > 0;
  const title = t(
    isRateLimited ? "assignments_rate_limited" : "assignments_load_error"
  );
  const description = t(
    isRateLimited
      ? "assignments_rate_limited_desc"
      : "assignments_load_error_desc"
  );
  let retryButtonLabel = t("try_again");
  if (isRetrying) {
    retryButtonLabel = t("retrying");
  } else if (isWaitingForRetry) {
    retryButtonLabel = t("retry_after", { seconds: retryWaitSeconds });
  }
  const retryButton = (
    <Button
      aria-live={isWaitingForRetry ? "off" : undefined}
      disabled={isRetrying || isWaitingForRetry}
      onClick={onRetry}
      size="sm"
      variant="outline"
    >
      {retryButtonLabel}
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
        <AlertDescription className="text-xs">{description}</AlertDescription>
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
      </EmptyHeader>
      <EmptyContent>{retryButton}</EmptyContent>
    </Empty>
  );
}

export function AssignmentStaleWarning() {
  const { t } = useI18n();

  return (
    <output className="flex h-6 w-full items-center gap-1.5 text-muted-foreground text-xs">
      <CircleAlert className="size-3.5 shrink-0" />
      <p className="min-w-0 flex-1 leading-tight">
        {t("assignments_stale_warning")}
      </p>
    </output>
  );
}
