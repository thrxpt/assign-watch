import { ChevronRight, Lightbulb } from "lucide-react";
import { useState } from "react";

import { i18n } from "#imports";
import { Button } from "@/components/ui/button";

const TIPS = [
  "tips_desc",
  "tips_shortcut",
  "tips_calendar",
  "tips_restore",
] as const;

const SHORTCUT_KEY = /Mac/u.test(navigator.userAgent) ? "⌥" : "Alt";

function tipText(tip: (typeof TIPS)[number]) {
  if (tip === "tips_shortcut") {
    return i18n.t("tips_shortcut", { key: SHORTCUT_KEY });
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
        {tipText(TIPS[index])}
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
