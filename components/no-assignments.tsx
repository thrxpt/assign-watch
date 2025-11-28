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
        <EmptyTitle>ไม่มีการบ้าน</EmptyTitle>
        <EmptyDescription>ยินดีด้วย! คุณไม่มีการบ้านที่ต้องทำ</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
