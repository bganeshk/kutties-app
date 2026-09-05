import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';
import { computeActivityNormRating } from './studentactivity.model';

// Re-export shared types so consumers can import from this file.
export type { ActivityType, ActivityStatus } from './studentactivity.model';

// ── Excel sheet: CourseActivity ───────────────────────────────────────────────
// Columns: id, ActivityType, Scope, Course, Category, Title, Description,
//          StartDate, EndDate, Assignor, Assignee, Coordinator, Reviewer,
//          GradingTarget, Status, IsOverdue, SubmissionAttachments, SubmissionNote,
//          Rating, RatingNote, ClosedBy, ClosedAt, norm_rating, Revision, Lastmodified

export type CourseScope      = 'course' | 'school';
export type GradingTarget    = 'individual' | 'class';

export interface CourseActivityModel extends AuditFields {
  id: string;
  activityType?: string;            // Excel: ActivityType  — from reftbl assignmentTyperef
  scope?: CourseScope;              // Excel: Scope         — 'course' | 'school'
  course?: string;                  // Excel: Course        — required when scope = 'course'
  category?: string;                // Excel: Category      — from reftbl assignmentCatRef
  title?: string;                   // Excel: Title
  description?: string;             // Excel: Description
  startDate?: string;               // Excel: StartDate     — dd/MMM/yyyy
  endDate?: string;                 // Excel: EndDate       — dd/MMM/yyyy
  assignor?: string;                // Excel: Assignor      — staff email (creator)
  assignee?: string;                // Excel: Assignee      — teacher email (coordinator)
  coordinator?: string;             // Excel: Coordinator   — optional student leader
  reviewer?: string;                // Excel: Reviewer      — staff email
  gradingTarget?: GradingTarget;    // Excel: GradingTarget — 'individual' | 'class'
  status?: import('./studentactivity.model').ActivityStatus; // Excel: Status
  isOverdue?: boolean;              // Excel: IsOverdue     — computed; stored on close
  submissionAttachments?: string[]; // Excel: SubmissionAttachments — pipe-separated → array
  submissionNote?: string;          // Excel: SubmissionNote
  rating?: number;                  // Excel: Rating        — 1–5, or -1 overdue sentinel (class grading)
  ratingNote?: string;              // Excel: RatingNote    — reviewer's note on rating
  closedBy?: string;                // Excel: ClosedBy
  closedAt?: string;                // Excel: ClosedAt      — ISO timestamp
  revision?: number;                // Excel: Revision
  norm_rating?: number;             // Excel: norm_rating
}

// ── Pipe-separated attachment helpers (mirrors studentactivity.model) ─────────
export function parseCourseAttachments(raw?: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return (raw as unknown[]).map(String).filter(Boolean);
  if (typeof raw !== 'string') return [];
  return raw.split('|').map((u) => u.trim()).filter(Boolean);
}

export function serializeCourseAttachments(urls?: string[]): string | undefined {
  if (!urls || urls.length === 0) return undefined;
  return urls.join('|');
}

// ── Mapper — handles both raw Excel PascalCase keys and local DB camelCase ───
export function toCourseActivityModel(
  row: Record<string, unknown>,
): CourseActivityModel {
  const rawAttachments =
    (row.SubmissionAttachments ?? row.submissionAttachments) as string | undefined;
  const rawRating    = row.Rating    ?? row.rating;
  const rawRevision  = row.Revision  ?? row.revision;
  const rawIsOverdue = row.IsOverdue ?? row.isOverdue;

  const resolvedActivityType = (row.ActivityType ?? row.activityType) as string | undefined;
  const resolvedRating = rawRating != null ? Number(rawRating) : undefined;

  return {
    id:            String(row.id ?? row.Id ?? ''),
    activityType:  resolvedActivityType,
    scope:         (row.Scope         ?? row.scope)         as CourseScope | undefined,
    course:        (row.Course        ?? row.course)        as string | undefined,
    category:      (row.Category      ?? row.category)      as string | undefined,
    title:         (row.Title         ?? row.title)         as string | undefined,
    description:   (row.Description   ?? row.description)   as string | undefined,
    startDate:     normaliseDate(row.StartDate ?? row.startDate),
    endDate:       normaliseDate(row.EndDate   ?? row.endDate),
    assignor:      (row.Assignor      ?? row.assignor)      as string | undefined,
    assignee:      (row.Assignee      ?? row.assignee)      as string | undefined,
    coordinator:   (row.Coordinator   ?? row.coordinator)   as string | undefined,
    reviewer:      (row.Reviewer      ?? row.reviewer)      as string | undefined,
    gradingTarget: (row.GradingTarget ?? row.gradingTarget) as GradingTarget | undefined,
    status:        (row.Status        ?? row.status) as
      import('./studentactivity.model').ActivityStatus | undefined,
    isOverdue:     rawIsOverdue === 'true' || rawIsOverdue === true,
    submissionAttachments: parseCourseAttachments(rawAttachments),
    submissionNote: (row.SubmissionNote ?? row.submissionNote) as string | undefined,
    rating:        resolvedRating,
    ratingNote:    (row.RatingNote    ?? row.ratingNote)    as string | undefined,
    closedBy:      (row.ClosedBy      ?? row.closedBy)      as string | undefined,
    closedAt:      (row.ClosedAt      ?? row.closedAt)      as string | undefined,
    revision:      rawRevision != null ? Number(rawRevision) : undefined,
    lastmodified:  (row.Lastmodified  ?? row.lastmodified)  as string | undefined,
    norm_rating:   computeActivityNormRating(
      resolvedActivityType as import('./studentactivity.model').ActivityType | undefined,
      resolvedRating,
    ),
  };
}
