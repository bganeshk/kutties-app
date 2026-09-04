import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Excel sheet: student_Observation_track ────────────────────────────────────
// Columns: id, Student, ObsDate, QuestionId, Answer, Remark, RecordedBy,
//          revision, lastmodified

export type ObservationAnswer = 'Yes' | 'No' | '';

export interface StudentObservationTrackModel extends AuditFields {
  id: string;
  regNumber?:  string;             // Excel: Student   — student reg number
  obsDate?:    string;             // Excel: ObsDate   — dd/MMM/yyyy
  questionId?: string;             // Excel: QuestionId
  answer?:     ObservationAnswer;  // Excel: Answer    — "Yes" | "No" | ""
  remark?:     string;             // Excel: Remark
  recordedBy?: string;             // Excel: RecordedBy
  revision?:   number;
}

// ── Mapper ────────────────────────────────────────────────────────────────────
export function toStudentObservationTrackModel(
  row: Record<string, unknown>,
): StudentObservationTrackModel {
  const rawAnswer = String(row.Answer ?? row.answer ?? '').trim();
  const answer: ObservationAnswer =
    rawAnswer === 'Yes' ? 'Yes' : rawAnswer === 'No' ? 'No' : '';

  return {
    id:          String(row.id ?? row.Id ?? ''),
    regNumber:   (row.Student    ?? row.regNumber)   as string | undefined,
    obsDate:     normaliseDate(row.ObsDate ?? row.obsDate),
    questionId:  (row.QuestionId ?? row.questionId)  as string | undefined,
    answer,
    remark:      (row.Remark     ?? row.remark)      as string | undefined,
    recordedBy:  (row.RecordedBy ?? row.recordedBy)  as string | undefined,
    revision:    row.revision != null ? Number(row.revision) : undefined,
    lastmodified:(row.lastmodified ?? row.Lastmodified) as string | undefined,
  };
}
