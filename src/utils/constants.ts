// ── Sheet names ───────────────────────────────────────────────────────────────

export const SHEETS = {
  STAFF:             'staff',       // merged teachers + employees (designation='Teacher' → teacher)
  STUDENTS:          'students',
  COURSES:           'courses',
  COURSE_TIMETABLE:  'coursetimetbl',
  DASHBOARD:         'dashboard',
  PRODUCTS:          'products',
  REFTBL:            'reftbl',
  HANDBOOK:          'handbook',
  FEEDBACK:          'feedback',
  TEACATTELOG:          'StaffAttendanceLog',
  STUDENT_ATT_LOG:      'StudentAttendanceLog',
  STUDENT_HEALTH:       'student_health_report',
  STUDENT_FEE:          'stfee',
  STAFF_PAY:            'staffpay',
  STUDENT_DIARY:        'StudentDiary',
  PARENT_NOTE:          'ParentNote',
  STUDENT_MARK_SHEET:   'StudentMarkSheet',
  STUDENT_ACTIVITY:          'StudentActivity',
  STUDENT_OBSERVATION_QN:    'student_Observation_Qn',
  STUDENT_OBSERVATION_TRACK: 'student_Observation_track',
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
