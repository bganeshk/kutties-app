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
};

export function resolveScreen(appviewsheet: string): string {
  return APP_SCREEN_MAP[appviewsheet.trim()] ?? 'Landing';
}
