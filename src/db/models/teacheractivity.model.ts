import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';
import { computeActivityNormRating } from './studentactivity.model';

// Re-export shared types so consumers can import from either model file.
export type { ActivityType, ActivityStatus } from './studentactivity.model';

// ── Excel sheet: TeacherActivity ──────────────────────────────────────────────
// Columns: id, ActivityType, Category, Course,
//          Assignor, Assignee, Reviewer,
//          Title, Description,
//          StartDate, EndDate,
//          Status, IsOverdue,
//          SubmissionAttachments, SubmissionNote,
//          Rating, RatingNote, ClosedBy, ClosedAt,
//          norm_rating, Revision, Lastmodified

export interface TeacherActivityModel extends AuditFields {
  id: string;
  activityType?: import('./studentactivity.model').ActivityType;   // Excel: ActivityType
  category?: string;               // Excel: Category
  course?: string;                 // Excel: Course
  assignor?: string;               // Excel: Assignor   — staff email (creator)
  assignee?: string;               // Excel: Assignee   — teacher email (assignee)
  reviewer?: string;               // Excel: Reviewer   — staff email (Assignment / Task)
  title?: string;                  // Excel: Title
  description?: string;            // Excel: Description
  startDate?: string;              // Excel: StartDate  — dd/MMM/yyyy
  endDate?: string;                // Excel: EndDate    — dd/MMM/yyyy
  status?: import('./studentactivity.model').ActivityStatus; // Excel: Status
  isOverdue?: boolean;             // Excel: IsOverdue  — computed; stored on close
  submissionAttachments?: string[];// Excel: SubmissionAttachments — pipe-separated → array
  submissionNote?: string;         // Excel: SubmissionNote
  rating?: number;                 // Excel: Rating     — 1–5, or -1 overdue sentinel
  ratingNote?: string;             // Excel: RatingNote — reviewer's note on rating
  closedBy?: string;               // Excel: ClosedBy
  closedAt?: string;               // Excel: ClosedAt   — ISO timestamp
  revision?: number;               // Excel: Revision
  // norm_rating: overdue (rating < 0) → exact rating (no multiplier)
  //              Assignment → 3 × rating | Task → 2 × rating | else → rating
  norm_rating?: number;            // Excel: norm_rating
}

// ── Pipe-separated attachment helpers (mirrors studentactivity.model) ─────────
export function parseTeacherAttachments(raw?: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return (raw as unknown[]).map(String).filter(Boolean);
  if (typeof raw !== 'string') return [];
  return raw.split('|').map((u) => u.trim()).filter(Boolean);
}

export function serializeTeacherAttachments(urls?: string[]): string | undefined {
  if (!urls || urls.length === 0) return undefined;
  return urls.join('|');
}

// ── Mapper — handles both raw Excel PascalCase keys and local DB camelCase ───
export function toTeacherActivityModel(
  row: Record<string, unknown>,
): TeacherActivityModel {
  const rawAttachments =
    (row.SubmissionAttachments ?? row.submissionAttachments) as string | undefined;
  const rawRating   = row.Rating    ?? row.rating;
  const rawRevision = row.Revision  ?? row.revision;
  const rawIsOverdue = row.IsOverdue ?? row.isOverdue;

  const resolvedActivityType = (row.ActivityType ?? row.activityType) as
    import('./studentactivity.model').ActivityType | undefined;
  const resolvedRating = rawRating != null ? Number(rawRating) : undefined;

  return {
    id:           String(row.id ?? row.Id ?? ''),
    activityType: resolvedActivityType,
    category:     (row.Category    ?? row.category)     as string | undefined,
    course:       (row.Course      ?? row.course)       as string | undefined,
    assignor:     (row.Assignor    ?? row.assignor)     as string | undefined,
    assignee:     (row.Assignee    ?? row.assignee)     as string | undefined,
    reviewer:     (row.Reviewer    ?? row.reviewer)     as string | undefined,
    title:        (row.Title       ?? row.title)        as string | undefined,
    description:  (row.Description ?? row.description)  as string | undefined,
    startDate:    normaliseDate(row.StartDate ?? row.startDate),
    endDate:      normaliseDate(row.EndDate   ?? row.endDate),
    status:       (row.Status      ?? row.status) as
      import('./studentactivity.model').ActivityStatus | undefined,
    isOverdue:    rawIsOverdue === 'true' || rawIsOverdue === true,
    submissionAttachments: parseTeacherAttachments(rawAttachments),
    submissionNote: (row.SubmissionNote ?? row.submissionNote) as string | undefined,
    rating:       resolvedRating,
    ratingNote:   (row.RatingNote  ?? row.ratingNote)   as string | undefined,
    closedBy:     (row.ClosedBy    ?? row.closedBy)     as string | undefined,
    closedAt:     (row.ClosedAt    ?? row.closedAt)     as string | undefined,
    revision:     rawRevision != null ? Number(rawRevision) : undefined,
    lastmodified: (row.Lastmodified ?? row.lastmodified) as string | undefined,
    norm_rating:  computeActivityNormRating(resolvedActivityType, resolvedRating),
  };
}
