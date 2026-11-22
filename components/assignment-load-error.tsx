import { CircleAlert, Timer } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

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
import { cn } from "@/lib/utils";

function subscribeToRetryDeadline(notify: () => void, deadline: number | null) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (deadline !== null) {
    const scheduleUpdate = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        return;
      }

      timer = setTimeout(
        () => {
          notify();
          scheduleUpdate();
        },
        Math.min(1000, remaining)
      );
    };
    scheduleUpdate();
  }

  return () => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  };
}

interface AssignmentLoadErrorProps {
  className?: string;
  isRateLimited: boolean;
  isRetrying: boolean;
  onRetry: () => Promise<void>;
  presentation?: "empty" | "inline";
  retryAt: number | null;
}

export function AssignmentLoadError({
  className,
  isRateLimited,
  isRetrying,
  onRetry,
  presentation = "empty",
  retryAt,
}: AssignmentLoadErrorProps) {
  const { t } = useI18n();
  const deadline = isRateLimited ? retryAt : null;
  const readSeconds = useCallback(
    () =>
      deadline === null
        ? 0
        : Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
    [deadline]
  );
  const subscribe = useCallback(
    (notify: () => void) => subscribeToRetryDeadline(notify, deadline),
    [deadline]
  );
  const retryWaitSeconds = useSyncExternalStore(
    subscribe,
    readSeconds,
    readSeconds
  );
  const isWaitingForRetry = retryWaitSeconds > 0;
  const title = t(
    isRateLimited ? "assignments_rate_limited" : "assignments_load_error"
  );
  const rateLimitDescriptionKey =
    presentation === "inline"
      ? "assignments_rate_limited_inline_description"
      : "assignments_rate_limited_description";
  const description = t(
    isRateLimited
      ? rateLimitDescriptionKey
      : "assignments_load_error_description"
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
        className={cn(
          "shrink-0 has-data-[slot=alert-action]:pr-3 sm:has-data-[slot=alert-action]:pr-32",
          className
        )}
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
    <Empty
      aria-atomic="true"
      aria-live="polite"
      className={cn("flex-none", className)}
    >
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
      <span className="min-w-0 flex-1 leading-tight">
        {t("assignments_stale_warning")}
      </span>
    </output>
  );
}
