import type { AuditFields } from './audit.model';
import { normaliseDate, extractTime } from './date.utils';

// ── Domain model (what the UI works with) ────────────────────────────────
export interface CourseTimeTableModel extends AuditFields {
  id: string;
  courseDivision: string;   // stored as "CourseName: Division" e.g. "LKG: A"
  day: string;              // ref from dayref in reftbl
  subject: string;          // ref from subject_ref in reftbl
  teacher: string;          // teacher email (FK → teachers table)
  startTime?: string;       // e.g. "09:45"
  endTime?: string;         // e.g. "10:30"
  notes?: string;
}

// ── Mapper — handles both raw API keys (PascalCase) and local DB keys ─────
// Excel column names confirmed: CourseDivision, Day, Subject, Teacher,
//   "Start Time", "End Time", Lastmodified
export function toCourseTimeTableModel(row: Record<string, unknown>): CourseTimeTableModel {
  return {
    id:             String(row.id ?? ''),
    courseDivision: String(row.CourseDivision ?? row.courseDivision ?? ''),
    day:            String(row.Day            ?? row.day            ?? ''),
    subject:        String(row.Subject        ?? row.subject        ?? ''),
    teacher:        String(row.Teacher        ?? row.teacher        ?? ''),
    // Excel columns have a space: "Start Time" / "End Time"
    startTime:      extractTime(row['Start Time'] ?? row.StartTime ?? row.startTime),
    endTime:        extractTime(row['End Time']   ?? row.EndTime   ?? row.endTime),
    notes:          (row.Notes ?? row.notes) as string | undefined,
    lastmodified:   normaliseDate(row.Lastmodified ?? row.lastmodified),
  };
}
