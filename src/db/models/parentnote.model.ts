import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Domain model ──────────────────────────────────────────────────────────────
// Excel sheet: ParentNote
// Columns: id, Student (RegNumber), NoteDate, NoteText, Category,
//          AcknowledgedBy, AcknowledgedAt, TeacherReply, Status,
//          ParentName, revision, lastmodified
//
// Rules:
//   • Parents create notes (NoteText, Category, ParentName).
//   • Teachers can only acknowledge (AcknowledgedBy, AcknowledgedAt)
//     and reply (TeacherReply). They cannot edit the original note.
//   • Status: 'pending' | 'acknowledged' | 'replied'

export type ParentNoteStatus = 'pending' | 'acknowledged' | 'replied';

export interface ParentNoteModel extends AuditFields {
  id: string;
  regNumber?: string;        // Excel: Student — student registration number
  noteDate?: string;         // Excel: NoteDate  (dd/MMM/yyyy)
  noteText?: string;         // Excel: NoteText  — note written by the parent
  category?: string;         // Excel: Category  (e.g. Absence, Health, Behaviour, Academic, General)
  parentName?: string;       // Excel: ParentName — name of the parent who wrote the note
  status?: ParentNoteStatus; // Excel: Status    — pending | acknowledged | replied
  acknowledgedBy?: string;   // Excel: AcknowledgedBy — teacher name
  acknowledgedAt?: string;   // Excel: AcknowledgedAt (dd/MMM/yyyy)
  teacherReply?: string;     // Excel: TeacherReply  — teacher's reply text
  revision?: number;         // Excel: revision
}

// ── Mapper ────────────────────────────────────────────────────────────────────
export function toParentNoteModel(row: Record<string, unknown>): ParentNoteModel {
  const rawStatus = (row.Status ?? row.status ?? 'pending') as string;
  const status: ParentNoteStatus =
    rawStatus === 'acknowledged' || rawStatus === 'replied'
      ? (rawStatus as ParentNoteStatus)
      : 'pending';

  return {
    id:              String(row.id ?? row.Id ?? ''),
    regNumber:       (row.Student ?? row.regNumber ?? row.RegNumber) as string | undefined,
    noteDate:        normaliseDate(row.NoteDate ?? row.noteDate),
    noteText:        (row.NoteText ?? row.noteText ?? row.Note ?? row.note) as string | undefined,
    category:        (row.Category ?? row.category) as string | undefined,
    parentName:      (row.ParentName ?? row.parentName ?? row.Parent ?? row.parent) as string | undefined,
    status,
    acknowledgedBy:  (row.AcknowledgedBy ?? row.acknowledgedBy) as string | undefined,
    acknowledgedAt:  normaliseDate(row.AcknowledgedAt ?? row.acknowledgedAt),
    teacherReply:    (row.TeacherReply ?? row.teacherReply ?? row.Reply ?? row.reply) as string | undefined,
    revision:        row.revision != null ? Number(row.revision) : undefined,
    lastmodified:    (row.lastmodified ?? row.Lastmodified) as string | undefined,
  };
}
