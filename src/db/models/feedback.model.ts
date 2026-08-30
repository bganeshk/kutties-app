import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Domain model (what the UI works with) ─────────────────────────────────
export interface FeedbackModel extends AuditFields {
  id: string;
  studentName?: string;
  teacherName?: string;
  subject?: string;
  feedbackDate?: string;
  rating?: string;           // '1' – '5'
  category?: string;         // e.g. 'Communication', 'Punctuality', 'Subject Knowledge', 'Overall'
  feedback?: string;         // free-form feedback text
  actionTaken?: string;      // follow-up action by school
  status?: 'open' | 'reviewed' | 'closed';
  remarks?: string;
}

// ── Mapper — handles both raw API key (PascalCase) and local DB key ────────
export function toFeedbackModel(
  row: Record<string, unknown>,
): FeedbackModel {
  const rawStatus = String(row.status ?? row.Status ?? '').toLowerCase();
  const status =
    rawStatus === 'reviewed' ? 'reviewed'
    : rawStatus === 'closed'   ? 'closed'
    : rawStatus === 'open'     ? 'open'
    : undefined;

  return {
    id:           String(row.id ?? ''),
    studentName:  (row.studentName  ?? row.StudentName)  as string | undefined,
    teacherName:  (row.teacherName  ?? row.TeacherName)  as string | undefined,
    subject:      (row.subject      ?? row.Subject)      as string | undefined,
    feedbackDate: normaliseDate(row.feedbackDate ?? row.FeedbackDate),
    rating:       String(row.rating ?? row.Rating ?? '').trim() || undefined,
    category:     (row.category     ?? row.Category)     as string | undefined,
    feedback:     (row.feedback     ?? row.Feedback)     as string | undefined,
    actionTaken:  (row.actionTaken  ?? row.ActionTaken)  as string | undefined,
    status,
    remarks:      (row.remarks      ?? row.Remarks)      as string | undefined,
    lastmodified: (row.lastmodified ?? row.Lastmodified) as string | undefined,
  };
}
