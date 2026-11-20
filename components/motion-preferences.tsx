import { createContext, use, useMemo } from "react";
import type { ReactNode } from "react";

import { reduceMotionStorage } from "@/lib/storage";
import { useStorageState } from "@/lib/use-storage-state";

interface MotionPreferences {
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => Promise<void>;
}

const MotionPreferencesContext = createContext<MotionPreferences>({
  reduceMotion: false,
  setReduceMotion: () => Promise.resolve(),
});

export function MotionPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [reduceMotion, setReduceMotion] = useStorageState(reduceMotionStorage);
  const preferences = useMemo(
    () => ({ reduceMotion, setReduceMotion }),
    [reduceMotion, setReduceMotion]
  );

  return (
    <MotionPreferencesContext.Provider value={preferences}>
      <div
        className="contents"
        data-reduce-motion={reduceMotion ? "true" : undefined}
      >
        {children}
      </div>
    </MotionPreferencesContext.Provider>
  );
}

export function useMotionPreferences() {
  return use(MotionPreferencesContext);
}
