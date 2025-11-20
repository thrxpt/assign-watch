import { PartyPopper } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function NoAssignments() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PartyPopper />
        </EmptyMedia>
        <EmptyTitle>No Assignments Yet</EmptyTitle>
        <EmptyDescription>
          Congratulations! You haven't assignments yet. Enjoy your free time.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
