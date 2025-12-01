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
      <TooltipTrigger>
        <Button variant="secondary" size="icon-sm">
          <CircleQuestionMark />
          <span className="sr-only">Tips</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          <span className="font-semibold">Tips:</span>{" "}
          คลิกขวาภายในกรอบของแต่ละวิชา หรือแต่ละงาน เพื่อซ่อนได้
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
