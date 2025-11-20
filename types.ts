export interface ClassInfo {
  id: number;
  title: string;
  description: string;
}

export interface RootResponse {
  user: User[];
  activities: Activity[];
}

export interface Activity {
  id: number;
  user_id: number;
  class_id: number;
  adv_starred: number;
  group_type: "IND" | "STU";
  type: "ASM" | "QUZ";
  peer_assessment: number;
  is_allow_repeat: number;
  title: string;
  description: string;
  start_date: string;
  due_date: string;
  edit_group_mode: string;
  created_at: string;
  user: number;
  activity_submission_id: number;
  class_user_id: number;
  activity_group_id: null;
  activity_group_name: null;
  activity_submission_submitted_at: Activitysubmissionsubmittedat;
  due_date_exceed: boolean;
  quiz_submission_is_submitted: number;
  count_group_member: number;
  activity_submission_is_late: boolean;
  fileactivities: number[];
  questions: number[];
  submissions?: Submission[];
}

interface Submission {
  id: number;
  activity_id: number;
  group_id: null;
  user_id: number;
  spent_time: null;
  description: string;
  description_file_id: null | number;
  is_submitted: number;
  submitted_at: string;
  deleted_at: null;
  created_at: string;
  updated_at: string;
  file_activity_submissions?: Fileactivitysubmission[];
}

interface Fileactivitysubmission {
  id: number;
  submission_id: number;
  activity_id: number;
  group_id: null;
  user_id: number;
  file_id: number;
  display_name: string;
  file_size: string;
  file_type: string;
  system_generate: number;
  deleted_at: null;
  created_at: string;
  updated_at: string;
}

interface Activitysubmissionsubmittedat {
  date: string;
  timezone_type: number;
  timezone: string;
}

interface User {
  id: number;
  firstname_en: string;
  lastname_en: string;
  firstname_th: string;
  lastname_th: string;
}
