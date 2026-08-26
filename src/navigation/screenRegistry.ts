// Maps appviewsheet values (from Excel dashboard) → registered stack screen names
export const APP_SCREEN_MAP: Record<string, string> = {
  'Teachers View':         'TeacherList',
  'Teacher Dash View':     'TeacherList',
  'Employee View':         'EmployeeList',
  'Employees View':        'EmployeeList',
  'Employee Dash View':    'EmployeeList',
};

export function resolveScreen(appviewsheet: string): string {
  return APP_SCREEN_MAP[appviewsheet.trim()] ?? 'Landing';
}
