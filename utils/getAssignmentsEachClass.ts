export async function getAssignmentsEachClass(classId: string) {
  const userId = getUserId()
  const url = `https://app.leb2.org/api/get/assessment-activities/student?class_id=${classId}&student_id=${userId}&filter_groups[0][filters][0][key]=class_id&filter_groups[0][filters][0][value]=${classId}&sort[]=sequence&sort[]=id&select[]=activities:id,user_id,class_id,adv_starred,group_type,type,peer_assessment,is_allow_repeat,title,description,start_date,due_date,edit_group_mode,created_at&select[]=user:id,firstname_en,lastname_en,firstname_th,lastname_th&includes[]=user:sideload&includes[]=fileactivities:ids&includes[]=questions:ids`

  const res = await fetch(url)
  return await res.json()
}
