import type { ComponentProps } from "react";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export const SHORTCUT_KEYS = [
  /Mac/u.test(globalThis.navigator?.userAgent ?? "") ? "⌥" : "Alt",
  "A",
];

export const SHORTCUT_KBD_CLASS =
  "border shadow-[0_1px_0_0_var(--border)] text-[10px] h-4 min-w-4 mb-0.5";

export function ShortcutKbd({
  className,
  kbdClassName,
  ...props
}: ComponentProps<typeof KbdGroup> & { kbdClassName?: string }) {
  return (
    <KbdGroup className={cn("align-middle", className)} {...props}>
      {SHORTCUT_KEYS.map((key) => (
        <Kbd className={cn(SHORTCUT_KBD_CLASS, kbdClassName)} key={key}>
          {key}
        </Kbd>
      ))}
    </KbdGroup>
  );
}
