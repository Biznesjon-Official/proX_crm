export interface Branch {
  id: string;
  name: string;
  district: string;
  address: string;
  phone: string;
  created_at: Date;
  updated_at: Date;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  branch_id: string;
  branch?: Branch;
  study_days: string[]; // ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  payment_date: string; // YYYY-MM-DD formatida to'lov sanasi
  created_at: Date;
  updated_at: Date;
}

export interface Attendance {
  id: string;
  student_id: string;
  student?: Student;
  date: Date;
  present: boolean | null;
  created_at: Date;
  updated_at: Date;
}

export interface AttendanceStats {
  student_id: string;
  student_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  attendance_rate: number;
}

export interface CreateBranchRequest {
  name: string;
  district: string;
  address: string;
  phone: string;
  username?: string;
  password?: string;
}

export interface CreateStudentRequest {
  name: string;
  phone: string;
  branch_id: string;
  study_days: string[];
  payment_date: string;
}

export interface MarkAttendanceRequest {
  student_id: string;
  date: string;
  present?: boolean | null;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'super_admin' | 'student' | 'mentor' | 'manager';
  branch_id: string | null; // null bo'lsa super_admin
  created_at: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface BranchStats {
  total_students: number;
  active_students: number;
  total_attendance_records: number;
  last_activity: Date | null;
}