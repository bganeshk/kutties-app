import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Domain model ──────────────────────────────────────────────────────────────
// Excel sheet: StudentMarkSheet
// Columns: id, Student (RegNumber), ExamName, ExamDate, Subject,
//          SubjTeacher, MaxMarks, MarksObtained, Grade, Remarks, RecordedBy,
//          Revision, Lastmodified
export interface StudentMarkSheetModel extends AuditFields {
  id: string;
  regNumber?: string;      // Excel: Student      — student reg number
  examName?: string;       // Excel: ExamName     — e.g. "Term 1", "Mid Term", "Final"
  examDate?: string;       // Excel: ExamDate     — date the exam was held
  subject?: string;        // Excel: Subject      — subject name
  subjTeacher?: string;    // Excel: SubjTeacher  — teacher who teaches this subject
  maxMarks?: number;       // Excel: MaxMarks     — maximum marks for subject
  marksObtained?: number;  // Excel: MarksObtained— marks scored by student
  grade?: string;          // Excel: Grade        — A / B / C / D / F (manual or auto)
  remarks?: string;        // Excel: Remarks      — teacher remarks
  recordedBy?: string;     // Excel: RecordedBy   — teacher who entered the record
  revision?: number;       // Excel: Revision
}

// ── Grade helper ──────────────────────────────────────────────────────────────
// Auto-compute grade from percentage; used when grade is not supplied.
export function computeGrade(marksObtained?: number, maxMarks?: number): string {
  if (marksObtained == null || maxMarks == null || maxMarks === 0) return '';
  const pct = (marksObtained / maxMarks) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 75) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 45) return 'C';
  if (pct >= 35) return 'D';
  return 'F';
}

// ── Mapper — handles both raw API keys (PascalCase) and local DB keys ─────────
export function toStudentMarkSheetModel(
  row: Record<string, unknown>,
): StudentMarkSheetModel {
  const marksObtained =
    row.MarksObtained ?? row.marksObtained;
  const maxMarks =
    row.MaxMarks ?? row.maxMarks;

  const rawGrade = (row.Grade ?? row.grade) as string | undefined;

  return {
    id:            String(row.id ?? row.Id ?? ''),
    regNumber:     (row.Student      ?? row.regNumber  ?? row.RegNumber) as string | undefined,
    examName:      (row.ExamName     ?? row.examName)                    as string | undefined,
    examDate:      normaliseDate(row.ExamDate ?? row.examDate),
    subject:       (row.Subject      ?? row.subject)                     as string | undefined,
    subjTeacher:   (row.SubjTeacher  ?? row.subjTeacher)                 as string | undefined,
    maxMarks:      maxMarks      != null ? Number(maxMarks)      : undefined,
    marksObtained: marksObtained != null ? Number(marksObtained) : undefined,
    grade:         rawGrade || computeGrade(
                     marksObtained != null ? Number(marksObtained) : undefined,
                     maxMarks      != null ? Number(maxMarks)      : undefined,
                   ) || undefined,
    remarks:       (row.Remarks    ?? row.remarks)    as string | undefined,
    recordedBy:    (row.RecordedBy ?? row.recordedBy) as string | undefined,
    revision:      row.Revision != null ? Number(row.Revision)
                 : row.revision != null ? Number(row.revision)
                 : undefined,
    lastmodified:  (row.Lastmodified ?? row.lastmodified) as string | undefined,
  };
}
