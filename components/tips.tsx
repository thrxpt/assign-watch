import { CircleQuestionMark } from "lucide-react";
import { i18n } from "#imports";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Tips() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button size="icon" variant="secondary">
            <CircleQuestionMark />
            <span className="sr-only">Tips</span>
          </Button>
        }
      />
      <TooltipContent>
        <p>
          <span className="font-semibold">{i18n.t("tips")}:</span>{" "}
          {i18n.t("tips_desc")}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
