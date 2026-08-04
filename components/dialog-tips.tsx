import { ChevronRight, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { i18n } from "#imports";
import { Button } from "@/components/ui/button";

import { Kbd, KbdGroup } from "./ui/kbd";

const TIPS = [
  "tips_desc",
  "tips_shortcut",
  "tips_calendar",
  "tips_restore",
] as const;

const SHORTCUT_TOKEN = "{shortcut}";
const SHORTCUT_KEYS = [/Mac/u.test(navigator.userAgent) ? "⌥" : "Alt", "A"];
const KBD_CLASS =
  "border shadow-[0_1px_0_0_var(--border)] text-[10px] h-4 min-w-4 mb-0.5";

function shortcutTip(): ReactNode {
  const [before, after] = i18n.t("tips_shortcut").split(SHORTCUT_TOKEN);

  return (
    <>
      {before}
      <KbdGroup className="-my-1 mx-0.5 align-middle">
        {SHORTCUT_KEYS.map((key) => (
          <Kbd className={KBD_CLASS} key={key}>
            {key}
          </Kbd>
        ))}
      </KbdGroup>
      {after ?? ""}
    </>
  );
}

function tipContent(tip: (typeof TIPS)[number]): ReactNode {
  if (tip === "tips_shortcut") {
    return shortcutTip();
  }
  return i18n.t(tip);
}

export function DialogTips() {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * TIPS.length)
  );

  return (
    <div className="flex w-full items-center gap-1.5 text-muted-foreground text-xs">
      <Lightbulb className="size-3.5 shrink-0" />
      <p className="min-w-0 flex-1 leading-tight">
        <span className="font-semibold">{i18n.t("tips")}:</span>{" "}
        {tipContent(TIPS[index])}
      </p>
      <Button
        onClick={() => setIndex((i) => (i + 1) % TIPS.length)}
        size="icon-xs"
        variant="ghost"
      >
        <ChevronRight />
        <span className="sr-only">{i18n.t("next_tip")}</span>
      </Button>
    </div>
  );
}
