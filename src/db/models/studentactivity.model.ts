import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Excel sheet: StudentActivity ──────────────────────────────────────────────
// Columns: id, ActivityType, Category, Course,
//          Assignor, Assignee, Reviewer,
//          Title, Description,
//          StartDate, EndDate,
//          Status, IsOverdue,
//          SubmissionAttachments, SubmissionNote,
//          Rating, RatingNote, ClosedBy, ClosedAt,
//          Revision, Lastmodified

export type ActivityType   = 'Assignment' | 'Task' | 'Notification';
export type ActivityStatus = 'open' | 'in-progress' | 'in-review' | 'closed';

export interface StudentActivityModel extends AuditFields {
  id: string;
  activityType?: ActivityType;     // Excel: ActivityType
  category?: string;               // Excel: Category
  course?: string;                 // Excel: Course
  assignor?: string;               // Excel: Assignor   — staff email (creator)
  assignee?: string;               // Excel: Assignee   — student reg number
  reviewer?: string;               // Excel: Reviewer   — staff email (Assignment / Task)
  title?: string;                  // Excel: Title
  description?: string;            // Excel: Description
  startDate?: string;              // Excel: StartDate  — dd/MMM/yyyy
  endDate?: string;                // Excel: EndDate    — dd/MMM/yyyy
  status?: ActivityStatus;         // Excel: Status
  isOverdue?: boolean;             // Excel: IsOverdue  — computed; stored on close
  submissionAttachments?: string[];// Excel: SubmissionAttachments — pipe-separated → array
  submissionNote?: string;         // Excel: SubmissionNote
  rating?: number;                 // Excel: Rating     — 1–5, or -1 overdue sentinel
  ratingNote?: string;             // Excel: RatingNote — reviewer's note on rating
  closedBy?: string;               // Excel: ClosedBy
  closedAt?: string;               // Excel: ClosedAt   — ISO timestamp
  revision?: number;               // Excel: Revision
}

// ── Computed helper ───────────────────────────────────────────────────────────
export function isActivityOverdue(activity: StudentActivityModel): boolean {
  if (!activity.endDate || activity.status === 'closed') return false;
  return new Date() > new Date(activity.endDate);
}

// ── Pipe-separated attachment helpers ────────────────────────────────────────
export function parseAttachments(raw?: unknown): string[] {
  if (!raw) return [];
  // Already an array (round-trip through model mapper)
  if (Array.isArray(raw)) return (raw as unknown[]).map(String).filter(Boolean);
  // Non-string primitive — nothing useful
  if (typeof raw !== 'string') return [];
  return raw.split('|').map((u) => u.trim()).filter(Boolean);
}

export function serializeAttachments(urls?: string[]): string | undefined {
  if (!urls || urls.length === 0) return undefined;
  return urls.join('|');
}

// ── Mapper — handles both raw Excel PascalCase keys and local DB camelCase ───
export function toStudentActivityModel(
  row: Record<string, unknown>,
): StudentActivityModel {
  const rawAttachments =
    (row.SubmissionAttachments ?? row.submissionAttachments) as string | undefined;
  const rawRating = row.Rating ?? row.rating;
  const rawRevision = row.Revision ?? row.revision;
  const rawIsOverdue = row.IsOverdue ?? row.isOverdue;

  return {
    id:           String(row.id ?? row.Id ?? ''),
    activityType: (row.ActivityType ?? row.activityType) as ActivityType | undefined,
    category:     (row.Category    ?? row.category)     as string | undefined,
    course:       (row.Course      ?? row.course)       as string | undefined,
    assignor:     (row.Assignor    ?? row.assignor)     as string | undefined,
    assignee:     (row.Assignee    ?? row.assignee)     as string | undefined,
    reviewer:     (row.Reviewer    ?? row.reviewer)     as string | undefined,
    title:        (row.Title       ?? row.title)        as string | undefined,
    description:  (row.Description ?? row.description)  as string | undefined,
    startDate:    normaliseDate(row.StartDate ?? row.startDate),
    endDate:      normaliseDate(row.EndDate   ?? row.endDate),
    status:       (row.Status      ?? row.status)       as ActivityStatus | undefined,
    isOverdue:    rawIsOverdue === 'true' || rawIsOverdue === true,
    submissionAttachments: parseAttachments(rawAttachments),
    submissionNote: (row.SubmissionNote ?? row.submissionNote) as string | undefined,
    rating:       rawRating  != null ? Number(rawRating)  : undefined,
    ratingNote:   (row.RatingNote  ?? row.ratingNote)   as string | undefined,
    closedBy:     (row.ClosedBy    ?? row.closedBy)     as string | undefined,
    closedAt:     (row.ClosedAt    ?? row.closedAt)     as string | undefined,
    revision:     rawRevision != null ? Number(rawRevision) : undefined,
    lastmodified: (row.Lastmodified ?? row.lastmodified) as string | undefined,
  };
}
