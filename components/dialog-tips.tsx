import { ChevronRight, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { ShortcutKbd } from "@/components/shortcut-kbd";
import { Button } from "@/components/ui/button";
import type { TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/use-i18n";

const TIPS = [
  "tips_desc",
  "tips_shortcut",
  "tips_calendar",
  "tips_restore",
] as const satisfies readonly TranslationKey[];

const SHORTCUT_TOKEN = "{shortcut}";

function shortcutTip(t: (key: TranslationKey) => string): ReactNode {
  const [before, after] = t("tips_shortcut").split(SHORTCUT_TOKEN);

  return (
    <>
      {before}
      <ShortcutKbd className="-my-1 mx-0.5" />
      {after ?? ""}
    </>
  );
}

function tipContent(
  tip: (typeof TIPS)[number],
  t: (key: TranslationKey) => string
): ReactNode {
  if (tip === "tips_shortcut") {
    return shortcutTip(t);
  }
  return t(tip);
}

export function DialogTips() {
  const { t } = useI18n();
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * TIPS.length)
  );

  return (
    <div className="flex w-full items-center gap-1.5 text-muted-foreground text-xs">
      <Lightbulb className="size-3.5 shrink-0" />
      <p className="min-w-0 flex-1 leading-tight">
        <span className="font-semibold">{t("tips")}:</span>{" "}
        {tipContent(TIPS[index], t)}
      </p>
      <Button
        onClick={() => setIndex((i) => (i + 1) % TIPS.length)}
        size="icon-xs"
        variant="ghost"
      >
        <ChevronRight />
        <span className="sr-only">{t("next_tip")}</span>
      </Button>
    </div>
  );
}
