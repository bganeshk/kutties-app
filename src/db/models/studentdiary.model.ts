import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Domain model ──────────────────────────────────────────────────────────────
// Excel sheet: StudentDiary
// Columns: id, Student (RegNumber), DiaryDate, Response, TeacherNote,
//          Category, Rating, Remarks, CreatedBy, revision, lastmodified
export interface StudentDiaryModel extends AuditFields {
  id: string;
  regNumber?: string;   // Excel: Student — student registration number
  diaryDate?: string;   // Excel: DiaryDate
  response?: string;    // Excel: Response — main diary entry
  teacherNote?: string; // Excel: TeacherNote — teacher's note/response
  category?: string;    // Excel: Category (e.g. Homework, Behaviour, Achievement)
  rating?: number;      // Excel: Rating — 1–5 star rating
  remarks?: string;     // Excel: remarks
  createdBy?: string;   // Excel: CreatedBy — teacher name who created the entry
  revision?: number;    // Excel: revision
}

// ── Mapper ────────────────────────────────────────────────────────────────────
export function toStudentDiaryModel(
  row: Record<string, unknown>,
): StudentDiaryModel {
  return {
    id:          String(row.id ?? row.Id ?? ''),
    regNumber:   (row.Student ?? row.regNumber ?? row.RegNumber) as string | undefined,
    diaryDate:   normaliseDate(row.DiaryDate ?? row.diaryDate),
    response:    (row.Response  ?? row.response ?? row.Content ?? row.content) as string | undefined,
    teacherNote: (row.TeacherNote ?? row.teacherNote ?? row.teacher_note) as string | undefined,
    category:    (row.Category  ?? row.category)  as string | undefined,
    rating:      (row.Rating ?? row.rating) != null ? Number(row.Rating ?? row.rating) : undefined,
    remarks:     (row.remarks   ?? row.Remarks)   as string | undefined,
    createdBy:   (row.CreatedBy ?? row.createdBy) as string | undefined,
    revision:    row.revision != null ? Number(row.revision) : undefined,
    lastmodified: (row.lastmodified ?? row.Lastmodified) as string | undefined,
  };
}
