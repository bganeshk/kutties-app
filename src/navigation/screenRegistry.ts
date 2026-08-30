// Maps appviewsheet values (from Excel dashboard) → registered stack screen names
export const APP_SCREEN_MAP: Record<string, string> = {
  'Teachers View':              'TeacherList',
  'Teacher Dash View':          'TeacherList',
  'Employee View':              'EmployeeList',
  'Employees View':             'EmployeeList',
  'Employee Dash View':         'EmployeeList',
  'Student View':               'StudentList',
  'Students View':              'StudentList',
  'Student Dash View':          'StudentList',
  'Courses View':               'CourseList',
  'Course View':                'CourseList',
  'Course Time Table View':     'CourseTimeTableList',
  'CourseTimeTable View':       'CourseTimeTableList',
  'Course Timetable View':      'CourseTimeTableList',
  'CourseTimeTableView':       'CourseTimeTableList',
  'Teacher Schedule View':     'TeacherSchedule',
  'TeacherSchedule View':      'TeacherSchedule',
  'Teacher Schedule':          'TeacherSchedule',
  'Handbook View':                      'HandbookList',
  'Handbook':                           'HandbookList',
  'Teachers Handbook':                  'HandbookList',
  'Teacher Handbook View':              'HandbookList',
  'Feedback':                        'FeedbackList',
  'Feedback View':                   'FeedbackList',
  'Teacher Attendance':              'TeacherAttendanceLogList',
  'Teacher Attendance View':         'TeacherAttendanceLogList',
  'Teacher Attendance Log':          'TeacherAttendanceLogList',
  'TeacherAttendanceLog View':       'TeacherAttendanceLogList',
  'TeacherAttDash':                  'TeacherAttendanceLogList',
  'Staff Attendance':                'TeacherAttendanceLogList',
  'Staff Attendance View':           'TeacherAttendanceLogList',
  'Employee Attendance':             'TeacherAttendanceLogList',
  'Employee Attendance View':        'TeacherAttendanceLogList',
  'Student Health':                  'StudentHealthList',
  'Student Health View':             'StudentHealthList',
  'Health Data':                     'StudentHealthList',
  'Health Data View':                'StudentHealthList',
  'Student Health Data':             'StudentHealthList',
  'Student Fee':                     'StudentFeeList',
  'Student Fee View':                'StudentFeeList',
  'Fee Summary':                     'StudentFeeList',
  'Fee Summary View':                'StudentFeeList',
  'Student Fee Summary':             'StudentFeeList',
  'Collect Fee':                     'StudentFeeForm',
  'Collect Fee View':                'StudentFeeForm',
};

// Build a lowercase lookup for case-insensitive fallback
const APP_SCREEN_MAP_LC: Record<string, string> = Object.fromEntries(
  Object.entries(APP_SCREEN_MAP).map(([k, v]) => [k.toLowerCase(), v]),
);

export function resolveScreen(appviewsheet: string): string {
  const trimmed = appviewsheet.trim();
  return APP_SCREEN_MAP[trimmed] ?? APP_SCREEN_MAP_LC[trimmed.toLowerCase()] ?? 'Landing';
}

/** Captions that should show non-teacher employee records. */
const STAFF_ATTENDANCE_CAPTIONS = new Set([
  'staff attendance',
  'staff attendance view',
  'employee attendance',
  'employee attendance view',
]);

/**
 * Returns true when the caption/appviewsheet refers to the staff-attendance
 * variant of TeacherAttendanceLogList (designation !== Teacher filter).
 */
export function isStaffAttendanceCaption(caption: string): boolean {
  return STAFF_ATTENDANCE_CAPTIONS.has(caption.trim().toLowerCase());
}
