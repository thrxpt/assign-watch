export type AssignmentResponse = {
  user: Array<{
    id: number
    firstname_en: string
    lastname_en: string
    firstname_th: string
    lastname_th: string
  }>
  activities: TActivity[]
}

export type TActivity = {
  id: number
  user_id: number
  class_id: number
  adv_starred: number
  group_type: string
  type: string
  peer_assessment: number
  is_allow_repeat: number
  title: string
  description: string
  start_date: string
  due_date: string | null
  edit_group_mode: string
  created_at: string
  user: number
  activity_submission_id: number | null
  class_user_id: number
  activity_group_id: number | null
  activity_group_name: string | null
  activity_submission_submitted_at: string | null
  due_date_exceed: boolean
  quiz_submission_is_submitted: number
  count_group_member: number
  activity_submission_is_late: boolean
  fileactivities: any[]
  questions: any[]
  submissions: any[]
}

export type TAssignmentFilter = {
  submit: {
    isSubmit: boolean
    isNotSubmit: boolean
  }
  type: {
    isIND: boolean
    isGRP: boolean
  }
  assessmentType: {
    isAssignment: boolean
    isQuiz: boolean
  }
}
