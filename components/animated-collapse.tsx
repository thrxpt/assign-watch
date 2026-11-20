import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useMotionPreferences } from "@/components/motion-preferences";
import { cn } from "@/lib/utils";

const EXIT_DURATION_MS = 300;
const EXIT_TIMEOUT_MS = EXIT_DURATION_MS + 50;

interface ExitActionOptions {
  animateExit?: boolean;
  timeoutMs?: number;
}

interface AnimatedCollapseProps {
  children: ReactNode;
  className?: string;
  /** Opens from zero height once, when the item mounts. */
  entering?: boolean;
  exiting?: boolean;
}

/**
 * Animates its own height and margin so a list can make room for, or reclaim
 * space from, an item instead of jumping. `overflow` is only clipped while
 * collapsed so sticky content inside keeps working normally.
 */
export function AnimatedCollapse({
  children,
  className,
  entering = false,
  exiting = false,
}: AnimatedCollapseProps) {
  const [isOpening, setIsOpening] = useState(entering);
  const opensOnMount = useRef(entering);

  useEffect(() => {
    if (!opensOnMount.current) {
      return;
    }

    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setIsOpening(false));
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, []);

  const isCollapsed = exiting || isOpening;
  let stateClassName = "grid-rows-[1fr]";
  if (exiting) {
    stateClassName =
      "pointer-events-none grid-rows-[0fr] -translate-y-0.5 scale-[0.98] opacity-0";
  } else if (isOpening) {
    stateClassName = "grid-rows-[0fr]";
  }

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity,scale,translate,margin-top] duration-300 ease-out motion-reduce:transition-none",
        className,
        isCollapsed && "mt-0",
        stateClassName
      )}
    >
      <div className={cn("min-h-0", isCollapsed && "overflow-hidden")}>
        {children}
      </div>
    </div>
  );
}

/**
 * Plays an exit animation before running the storage update, so hiding an item
 * does not make it vanish abruptly. Falls back to immediate action when the
 * user prefers reduced motion.
 */
export function useExitAction({
  animateExit = true,
  timeoutMs = EXIT_TIMEOUT_MS,
}: ExitActionOptions = {}) {
  const { reduceMotion } = useMotionPreferences();
  const [isExiting, setIsExiting] = useState(false);
  const isExitingRef = useRef(false);

  const exitThen = useCallback(
    (action: () => void) => {
      if (isExitingRef.current) {
        return;
      }

      isExitingRef.current = true;
      if (animateExit) {
        setIsExiting(true);
      }

      const systemPrefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const shouldReduceMotion = reduceMotion || systemPrefersReducedMotion;

      window.setTimeout(action, shouldReduceMotion ? 0 : timeoutMs);
    },
    [animateExit, reduceMotion, timeoutMs]
  );

  return { exitThen, isExiting: animateExit && isExiting };
}
