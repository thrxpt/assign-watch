import { useCallback } from "react";

import { formatTime } from "@/lib/date";
import type { TimeFormat } from "@/lib/preferences";
import { timeFormatStorage } from "@/lib/storage";
import { useStorageState } from "@/lib/use-storage-state";

export interface UseTimeFormatResult {
  formatTime: (date: Date) => string;
  setTimeFormat: (format: TimeFormat) => Promise<void>;
  timeFormat: TimeFormat;
}

export function useTimeFormat(): UseTimeFormatResult {
  const [timeFormat, setTimeFormat] = useStorageState(timeFormatStorage);

  const format = useCallback(
    (date: Date) => formatTime(date, timeFormat),
    [timeFormat]
  );

  return {
    formatTime: format,
    setTimeFormat,
    timeFormat,
  };
}
