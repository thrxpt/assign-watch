import { scrapeUserId } from "@/lib/dom";
import { userIdStorage } from "@/lib/storage";
import type { RootResponse } from "@/types";

export async function fetchAssignments(
  classId: number,
  userId?: string | null
) {
  const finalUserId =
    userId ?? scrapeUserId() ?? (await userIdStorage.getValue());
  const res = await fetch(
    `https://app.leb2.org/api/get/assessment-activities/student?class_id=${classId}&student_id=${finalUserId}&filter_groups[0][filters][0][key]=class_id&filter_groups[0][filters][0][value]=${classId}&sort[]=sequence&sort[]=id&select[]=activities:id,user_id,class_id,adv_starred,group_type,type,peer_assessment,is_allow_repeat,title,description,start_date,due_date,edit_group_mode,created_at&select[]=user:id,firstname_en,lastname_en,firstname_th,lastname_th&includes[]=user:sideload&includes[]=fileactivities:ids&includes[]=questions:ids`
  );
  const data = (await res.json()) as RootResponse;
  return data.activities.filter((activity) => activity.due_date !== null);
}
