// ── Sheet names ───────────────────────────────────────────────────────────────

export const SHEETS = {
  TEACHERS:          'teachers',
  EMPLOYEES:         'employees',
  STUDENTS:          'students',
  COURSES:           'courses',
  COURSE_TIMETABLE:  'coursetimetbl',
  DASHBOARD:         'dashboard',
  PRODUCTS:          'products',
  REFTBL:            'reftbl',
  HANDBOOK:          'handbook',
  FEEDBACK:          'feedback',
} as const;

// ── Calendar ──────────────────────────────────────────────────────────────────

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * Number of days in a given month.
 * @param year  - full year, e.g. 2024
 * @param month - 1-based month (1 = January, 12 = December)
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ── Student status colours ────────────────────────────────────────────────────

export const STUDENT_STATUS_DOT: Record<string, string> = {
  active:    '#2E7D32',
  inactive:  '#9E9E9E',
  Alumini:   '#342e9e',
  Graduated: '#d4d408',
};

export const STUDENT_STATUS_BG: Record<string, string> = {
  active:    '#F1F8E9',
  inactive:  '#F5F5F5',
  Alumini:   '#EFEFFF',
  Graduated: '#FFFDE7',
};

export const STUDENT_STATUS_COLOR: Record<string, string> = {
  active:    '#2E7D32',
  inactive:  '#757575',
  Alumini:   '#342e9e',
  Graduated: '#F57F17',
};

export const STUDENT_STATUS_BORDER: Record<string, string> = {
  active:    '#A5D6A7',
  inactive:  '#BDBDBD',
  Alumini:   '#9FA8DA',
  Graduated: '#FFE082',
};
