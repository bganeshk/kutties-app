import { toTeacherModel } from './teacher.model';
import { toStudentModel } from './student.model';
import { toDashboardModel } from './dashboard.model';
import { toProductModel } from './product.model';
import { toCourseModel } from './course.model';
import { toCourseTimeTableModel } from './coursetimetable.model';
import { toHandbookModel } from './handbook.model';
import { toFeedbackModel } from './feedback.model';
import { toTeacherAttendanceLogModel } from './teacherattendancelog.model';
import { toStudentHealthModel } from './studenthealth.model';
import { toStudentFeeModel } from './studentfee.model';
import { toStaffPayModel } from './staffpay.model';
import { toStudentAttendanceLogModel } from './studentattendancelog.model';
import { toStudentDiaryModel } from './studentdiary.model';
import { toParentNoteModel } from './parentnote.model';
import { toStudentMarkSheetModel } from './studentmarksheet.model';
import { toStudentActivityModel } from './studentactivity.model';
import { toTeacherActivityModel } from './teacheractivity.model';
import { toCourseActivityModel } from './courseactivity.model';
import { toStudentObservationQnModel } from './studentobservationqn.model';
import { toStudentObservationTrackModel } from './studentobservationtrack.model';

type RowTransformer = (raw: Record<string, unknown>) => Record<string, unknown>;

// Strip computed/non-storable fields before persisting
function stripComputed(obj: Record<string, unknown>): Record<string, unknown> {
  const { subjectList, ...rest } = obj as any;
  return rest;
}

/**
 * reftbl rows have a real `id` from the API.
 * Pass all columns through unchanged so getRefOptions can read them.
 */
function toReftblRow(raw: Record<string, unknown>): Record<string, unknown> {
  return { ...raw, id: String(raw.id ?? '').trim() };
}

const TRANSFORMERS: Record<string, RowTransformer> = {
  staff:     (raw) => stripComputed(toTeacherModel(raw)  as unknown as Record<string, unknown>),
  students:  (raw) => toStudentModel(raw) as unknown as Record<string, unknown>,
  dashboard: (raw) => stripComputed(toDashboardModel(raw) as unknown as Record<string, unknown>),
  products:  (raw) => stripComputed(toProductModel(raw)   as unknown as Record<string, unknown>),
  courses:         (raw) => stripComputed(toCourseModel(raw)            as unknown as Record<string, unknown>),
  coursetimetbl:   (raw) => toCourseTimeTableModel(raw)                 as unknown as Record<string, unknown>,
  Handbook:  (raw) => toHandbookModel(raw) as unknown as Record<string, unknown>,
  feedback:           (raw) => toFeedbackModel(raw)                as unknown as Record<string, unknown>,
  StaffAttendanceLog:      (raw) => toTeacherAttendanceLogModel(raw)  as unknown as Record<string, unknown>,
  student_health_report:   (raw) => toStudentHealthModel(raw)         as unknown as Record<string, unknown>,
  stfee:                   (raw) => toStudentFeeModel(raw)            as unknown as Record<string, unknown>,
  staffpay:                (raw) => toStaffPayModel(raw)              as unknown as Record<string, unknown>,
  StudentAttendanceLog:    (raw) => toStudentAttendanceLogModel(raw)  as unknown as Record<string, unknown>,
  StudentDiary:            (raw) => toStudentDiaryModel(raw)          as unknown as Record<string, unknown>,
  ParentNote:              (raw) => toParentNoteModel(raw)             as unknown as Record<string, unknown>,
  StudentMarkSheet:        (raw) => toStudentMarkSheetModel(raw)       as unknown as Record<string, unknown>,
  StudentActivity:         (raw) => toStudentActivityModel(raw)   as unknown as Record<string, unknown>,
  TeacherActivity:         (raw) => toTeacherActivityModel(raw)   as unknown as Record<string, unknown>,
  CourseActivity:          (raw) => toCourseActivityModel(raw)    as unknown as Record<string, unknown>,
  student_Observation_Qn:  (raw) => toStudentObservationQnModel(raw) as unknown as Record<string, unknown>,
  student_Observation_track:(raw) => toStudentObservationTrackModel(raw)     as unknown as Record<string, unknown>,
  reftbl:                  (raw) => toReftblRow(raw),
};

/**
 * Normalize a raw Excel row through its model mapper.
 * Falls back to identity if no model is registered for the sheet.
 */
export function normalizeRow(
  sheet: string,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const transform = TRANSFORMERS[sheet];
  return transform ? transform(raw) : raw;
}

/** Register a new sheet → model transformer at runtime */
export function registerModel(sheet: string, transformer: RowTransformer): void {
  TRANSFORMERS[sheet] = transformer;
}

// ── Excel-key mappers ─────────────────────────────────────────────────────
// Translate camelCase SQLite keys → the actual column names in the Excel sheet.
// Add an entry here whenever a sheet's Excel headers differ from the camelCase
// keys used internally.

const EXCEL_KEY_MAPS: Record<string, Record<string, string>> = {
  staffpay: {
    recptNo:     'Recpt No',
    payMode:     'Pay Mode',
    payMonth:    'Pay Month',
    amount:      'Amount',
    payDate:     'Pay Date',
    remarks:     'Remarks',
    revision:    'revision',
    lastmodified:'lastmodified',
  },
  stfee: {
    recptNo:     'recpt_no',
    regNumber:   'student',
    // dueDate, feeType, amount, paidDate, paymentMode, remarks, status
    // all match exactly — no rename needed
    revision:    'Revision',
    lastmodified: 'Lastmodified',
  },
  student_health_report: {
    regNumber:         'Student',
    checkupDate:       'CheckupDate',
    height:            'height',
    weight:            'weight',
    prescription:      'Prescription',
    bloodGroup:        'bloodGroup',
    allergies:         'allergies',
    medicalConditions: 'medicalConditions',
    medications:       'medications',
    remarks:           'remarks',
    revision:          'revision',
    lastmodified:      'lastmodified',
  },
  ParentNote: {
    regNumber:       'Student',
    noteDate:        'NoteDate',
    noteText:        'NoteText',
    category:        'Category',
    parentName:      'ParentName',
    status:          'Status',
    acknowledgedBy:  'AcknowledgedBy',
    acknowledgedAt:  'AcknowledgedAt',
    teacherReply:    'TeacherReply',
    revision:        'revision',
    lastmodified:    'lastmodified',
  },
  StudentDiary: {
    regNumber:    'Student',
    diaryDate:    'DiaryDate',
    response:     'Response',
    teacherNote:  'TeacherNote',
    category:     'Category',
    rating:       'Rating',
    remarks:      'remarks',
    createdBy:    'CreatedBy',
    revision:     'revision',
    lastmodified: 'lastmodified',
  },
  StudentMarkSheet: {
    regNumber:     'Student',
    examName:      'ExamName',
    examDate:      'ExamDate',
    subject:       'Subject',
    subjTeacher:   'SubjTeacher',
    maxMarks:      'MaxMarks',
    marksObtained: 'MarksObtained',
    grade:         'Grade',
    remarks:       'Remarks',
    recordedBy:    'RecordedBy',
    norm_rating:   'norm_rating',
    revision:      'Revision',
    lastmodified:  'Lastmodified',
  },
  student_Observation_Qn: {
    question:  'Question',
    category:  'Category',
    sortOrder: 'SortOrder',
    active:    'Active',
    // 'course' matches the Excel column name exactly — no rename needed
  },
  student_Observation_track: {
    regNumber:    'Student',
    obsDate:      'ObsDate',
    questionId:   'QuestionId',
    answer:       'Answer',
    remark:       'Remark',
    recordedBy:   'RecordedBy',
    revision:     'revision',
    lastmodified: 'lastmodified',
  },
  StudentActivity: {
    activityType:          'ActivityType',
    category:              'Category',
    course:                'Course',
    assignor:              'Assignor',
    assignee:              'Assignee',
    reviewer:              'Reviewer',
    title:                 'Title',
    description:           'Description',
    startDate:             'StartDate',
    endDate:               'EndDate',
    status:                'Status',
    isOverdue:             'IsOverdue',
    submissionAttachments: 'SubmissionAttachments',
    submissionNote:        'SubmissionNote',
    rating:                'Rating',
    ratingNote:            'RatingNote',
    closedBy:              'ClosedBy',
    closedAt:              'ClosedAt',
    norm_rating:           'norm_rating',
    revision:              'Revision',
    lastmodified:          'Lastmodified',
  },
  TeacherActivity: {
    activityType:          'ActivityType',
    category:              'Category',
    course:                'Course',
    assignor:              'Assignor',
    assignee:              'Assignee',
    reviewer:              'Reviewer',
    title:                 'Title',
    description:           'Description',
    startDate:             'StartDate',
    endDate:               'EndDate',
    status:                'Status',
    isOverdue:             'IsOverdue',
    submissionAttachments: 'SubmissionAttachments',
    submissionNote:        'SubmissionNote',
    rating:                'Rating',
    ratingNote:            'RatingNote',
    closedBy:              'ClosedBy',
    closedAt:              'ClosedAt',
    norm_rating:           'norm_rating',
    revision:              'Revision',
    lastmodified:          'Lastmodified',
  },
  CourseActivity: {
    activityType:          'ActivityType',
    scope:                 'Scope',
    course:                'Course',
    category:              'Category',
    title:                 'Title',
    description:           'Description',
    startDate:             'StartDate',
    endDate:               'EndDate',
    assignor:              'Assignor',
    assignee:              'Assignee',
    coordinator:           'Coordinator',
    reviewer:              'Reviewer',
    gradingTarget:         'GradingTarget',
    status:                'Status',
    isOverdue:             'IsOverdue',
    submissionAttachments: 'SubmissionAttachments',
    submissionNote:        'SubmissionNote',
    rating:                'Rating',
    ratingNote:            'RatingNote',
    closedBy:              'ClosedBy',
    closedAt:              'ClosedAt',
    norm_rating:           'norm_rating',
    revision:              'Revision',
    lastmodified:          'Lastmodified',
  },
  // StudentAttendanceLog: all column names match camelCase keys exactly — no renames needed.
  coursetimetbl: {
    courseDivision: 'CourseDivision',
    day:            'Day',
    subject:        'Subject',
    teacher:        'Teacher',
    startTime:      'Start Time',
    endTime:        'End Time',
    lastmodified:   'Lastmodified',
  },
  students: {
    regNumber:    'RegNumber',
    fullName:     'FullName',
    motherName:   'mother_name',
    fatherName:   'father_name',
    address:      'ContactAddress',
    phone:        'phone_1',
    phone2:       'phone_2',
    dob:          'DoB',
    email:        'emailId',
    status:       'Status',
    afterSchool:  'AfterSchool',
    optWeekend:   'Opt Weekend',
    idphoto:      'IdPhoto',
    admissionDate: 'AdmissionDt',
    lastmodified: 'Lastmodified',
    // 'course' is the same in both — no mapping needed
  },
};

/**
 * Translate a camelCase SQLite payload to the Excel column names for the sheet.
 * Keys not listed in the map are passed through unchanged.
 */
export function toExcelRow(
  sheet: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const map = EXCEL_KEY_MAPS[sheet];
  if (!map) return data;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[map[key] ?? key] = value;
  }
  return result;
}
