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
  'Fee Pending':                     'FeePending',
  'Fee Pending View':                'FeePending',
  'Pending Fees':                    'FeePending',
  'Pending Fees View':               'FeePending',
  'Staff Salary':                    'StaffPayList',
  'Staff Salary View':               'StaffPayList',
  'Staff Pay':                       'StaffPayList',
  'Staff Pay View':                  'StaffPayList',
  'Teacher Salary':                  'StaffPayList',
  'Teacher Salary View':             'StaffPayList',
  'Salary':                          'StaffPayList',
  'My Leave':                        'TeacherAttendanceLogList',
  'My Leave View':                   'TeacherAttendanceLogList',
  'Staff Leave':                     'TeacherAttendanceLogList',
  'Staff Leave View':                'TeacherAttendanceLogList',
  'Leave':                           'TeacherAttendanceLogList',
  'Leave View':                      'TeacherAttendanceLogList',
  'Student Attendance':              'StudentAttendanceLogList',
  'Student Attendance View':         'StudentAttendanceLogList',
  'StudentAttendanceLog View':       'StudentAttendanceLogList',
  'Student Attendance Log':          'StudentAttendanceLogList',
  'StudentAttendanceLog':            'StudentAttendanceLogList',
  'Attendance Log':                  'StudentAttendanceLogList',
  'Attendance Log View':             'StudentAttendanceLogList',
  'Student Att Log':                 'StudentAttendanceLogList',
  'Course Attendance':               'StudentAttendanceLogList',
  'Course Attendance View':          'StudentAttendanceLogList',
  'Student Diary':                   'StudentDiaryList',
  'Student Diary View':              'StudentDiaryList',
  'StudentDiary View':               'StudentDiaryList',
  'Diary':                           'StudentDiaryList',
  'Diary View':                      'StudentDiaryList',
  'Class Diary':                     'StudentDiaryList',
  'Class Diary View':                'StudentDiaryList',
  'Parent Note':                     'ParentNoteList',
  'Parent Note View':                'ParentNoteList',
  'Parent Notes':                    'ParentNoteList',
  'ParentNote View':                 'ParentNoteList',
  'Student Mark Sheet':              'StudentMarkSheetList',
  'Student Mark Sheet View':         'StudentMarkSheetList',
  'Mark Sheet':                      'StudentMarkSheetList',
  'Mark Sheet View':                 'StudentMarkSheetList',
  'StudentMarkSheet View':           'StudentMarkSheetList',
  'Student Marks':                   'StudentMarkSheetList',
  'Student Marks View':              'StudentMarkSheetList',
  'Teacher Student Marks':           'TeacherStudentMarkList',
  'Teacher Student Marks View':      'TeacherStudentMarkList',
  'TeacherStudentMark View':         'TeacherStudentMarkList',
  'Teacher Marks':                   'TeacherStudentMarkList',
  'Teacher Marks View':              'TeacherStudentMarkList',
  'Teacher Activity':                'TeacherActivityList',
  'Teacher Activity View':           'TeacherActivityList',
  'TeacherActivity View':            'TeacherActivityList',
  'Teacher Assignments':             'TeacherActivityList',
  'Teacher Assignments View':        'TeacherActivityList',
  'Teacher Tasks':                   'TeacherActivityList',
  'Teacher Tasks View':              'TeacherActivityList',
  'Student Activity':                'StudentActivityList',
  'Student Activity View':           'StudentActivityList',
  'StudentActivity View':            'StudentActivityList',
  'Assignments':                     'StudentActivityList',
  'Assignments View':                'StudentActivityList',
  'Assignment View':                 'StudentActivityList',
  'Student Assignments':             'StudentActivityList',
  'Student Assignments View':        'StudentActivityList',
  'Tasks':                           'StudentActivityList',
  'Tasks View':                      'StudentActivityList',
  'Student Tasks':                   'StudentActivityList',
  'Student Tasks View':              'StudentActivityList',
  'Student Rating':                  'StudentRatingList',
  'Student Rating View':             'StudentRatingList',
  'Rating View':                     'StudentRatingList',
  'Teacher Rating':                  'TeacherRatingList',
  'Teacher Rating View':             'TeacherRatingList',
  'TeacherRating View':              'TeacherRatingList',
  'Student Observation':             'StudentObservationList',
  'Student Observation View':        'StudentObservationList',
  'Observation':                     'StudentObservationList',
  'Observation View':                'StudentObservationList',
  'Observation Qn':                  'StudentObservationList',
  'Observation Qn View':             'StudentObservationList',
  'Student Observation Qn':          'StudentObservationList',
  'Student Observation Qn View':     'StudentObservationList',
  'ObservationQn':                   'StudentObservationList',
  'Course Activity':                 'CourseActivityList',
  'Course Activity View':            'CourseActivityList',
  'CourseActivity View':             'CourseActivityList',
  'Course Activities':               'CourseActivityList',
  'Course Activities View':          'CourseActivityList',
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

/** Captions that map to StudentAttendanceLogList */
const STUDENT_ATTENDANCE_CAPTIONS = new Set([
  'student attendance',
  'student attendance view',
  'studentattendancelog view',
  'student attendance log',
  'studentattendancelog',
]);

export function isStudentAttendanceCaption(caption: string): boolean {
  return STUDENT_ATTENDANCE_CAPTIONS.has(caption.trim().toLowerCase());
}

/** Captions that should open the leave-only view (absent/non-present records for all staff). */
const LEAVE_CAPTIONS = new Set([
  'my leave',
  'my leave view',
  'staff leave',
  'staff leave view',
  'leave',
  'leave view',
]);

/**
 * Returns true when the caption refers to the leave-only variant of
 * TeacherAttendanceLogList (shows only non-present staff records).
 */
export function isLeaveCaption(caption: string): boolean {
  return LEAVE_CAPTIONS.has(caption.trim().toLowerCase());
}

/** Captions that map to ParentNoteList */
const PARENT_NOTE_CAPTIONS = new Set([
  'parent note',
  'parent note view',
  'parent notes',
  'parentnote view',
]);

export function isParentNoteCaption(caption: string): boolean {
  return PARENT_NOTE_CAPTIONS.has(caption.trim().toLowerCase());
}

/** Captions that map to StudentMarkSheetList */
const STUDENT_MARK_SHEET_CAPTIONS = new Set([
  'student mark sheet',
  'student mark sheet view',
  'mark sheet',
  'mark sheet view',
  'studentmarksheet view',
  'student marks',
  'student marks view',
]);

export function isStudentMarkSheetCaption(caption: string): boolean {
  return STUDENT_MARK_SHEET_CAPTIONS.has(caption.trim().toLowerCase());
}

/** Captions that map to StudentDiaryList */
const STUDENT_DIARY_CAPTIONS = new Set([
  'student diary',
  'student diary view',
  'studentdiary view',
  'diary',
  'diary view',
  'class diary',
  'class diary view',
]);

export function isStudentDiaryCaption(caption: string): boolean {
  return STUDENT_DIARY_CAPTIONS.has(caption.trim().toLowerCase());
}

/** Captions that map to StudentActivityList */
const STUDENT_ACTIVITY_CAPTIONS = new Set([
  'student activity',
  'student activity view',
  'studentactivity view',
  'assignments',
  'assignments view',
  'assignment view',
  'student assignments',
  'student assignments view',
  'tasks',
  'tasks view',
  'student tasks',
  'student tasks view',
]);

export function isStudentActivityCaption(caption: string): boolean {
  return STUDENT_ACTIVITY_CAPTIONS.has(caption.trim().toLowerCase());
}

/** Captions that map to TeacherActivityList */
const TEACHER_ACTIVITY_CAPTIONS = new Set([
  'teacher activity',
  'teacher activity view',
  'teacheractivity view',
  'teacher assignments',
  'teacher assignments view',
  'teacher tasks',
  'teacher tasks view',
]);

export function isTeacherActivityCaption(caption: string): boolean {
  return TEACHER_ACTIVITY_CAPTIONS.has(caption.trim().toLowerCase());
}

/** Captions that map to CourseActivityList */
const COURSE_ACTIVITY_CAPTIONS = new Set([
  'course activity',
  'course activity view',
  'courseactivity view',
  'course activities',
  'course activities view',
  'course assignment',
  'course assignments',
  'course tasks',
  'course task',
]);

export function isCourseActivityCaption(caption: string): boolean {
  return COURSE_ACTIVITY_CAPTIONS.has(caption.trim().toLowerCase());
}

/** parentview values that belong to a Course context */
const COURSE_PARENTVIEWS = new Set([
  'course',
  'courses',
  'course management',
  'course activities',
  'course activity',
  // intermediate drill-down levels under the Course tab
  'assignment',
  'assignments',
  'task',
  'tasks',
  'course assignment',
  'course assignments',
  'course task',
  'course tasks',
  'notification',
  'notifications',
  'course notification',
  'course notifications',
]);

/**
 * Returns true when the parentview indicates we are inside a course context.
 * Used to disambiguate generic captions like "Assignment" / "Tasks" that would
 * otherwise route to StudentActivityList.
 */
export function isCourseParentview(parentview: string): boolean {
  return COURSE_PARENTVIEWS.has(parentview.trim().toLowerCase());
}
