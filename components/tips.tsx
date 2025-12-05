import { i18n } from "#i18n";
import { CircleQuestionMark } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Tips() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="secondary" size="icon-sm">
          <CircleQuestionMark />
          <span className="sr-only">Tips</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          <span className="font-semibold">{i18n.t("tips")}:</span>{" "}
          {i18n.t("tips_desc")}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
