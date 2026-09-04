import type { StudentMarkSheetModel } from '../../../db/models/studentmarksheet.model';
import type { StudentActivityModel } from '../../../db/models/studentactivity.model';

// ── Subject-wise rating ───────────────────────────────────────────────────────

export interface SubjectRating {
  subject: string;
  avgNormRating: number;
  examCount: number;
}

export function computeSubjectRatings(marks: StudentMarkSheetModel[]): SubjectRating[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const m of marks) {
    const subj = m.subject?.trim() || 'Unknown';
    const nr = m.norm_rating;
    if (nr == null) continue;
    const entry = map.get(subj) ?? { sum: 0, count: 0 };
    entry.sum   += nr;
    entry.count += 1;
    map.set(subj, entry);
  }
  return Array.from(map.entries())
    .map(([subject, { sum, count }]) => ({
      subject,
      avgNormRating: Math.round((sum / count) * 10) / 10,
      examCount: count,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

// ── Academic rating ───────────────────────────────────────────────────────────

export function computeAcademicRating(marks: StudentMarkSheetModel[]): number | null {
  const valid = marks.filter((m) => m.norm_rating != null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, m) => acc + m.norm_rating!, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

// ── Activity category breakdown ───────────────────────────────────────────────

export interface ActivityCategoryRow {
  category: string;
  count: number;
  avgRating: number;
  overdueCount: number;
}

export function computeActivityCategoryBreakdown(
  activities: StudentActivityModel[],
): ActivityCategoryRow[] {
  const map = new Map<string, { sum: number; count: number; overdue: number }>();
  for (const a of activities) {
    const cat = a.category?.trim() || 'Uncategorised';
    const nr  = a.norm_rating;
    if (nr == null) continue;
    const entry = map.get(cat) ?? { sum: 0, count: 0, overdue: 0 };
    entry.sum    += nr;
    entry.count  += 1;
    if (a.isOverdue) entry.overdue += 1;
    map.set(cat, entry);
  }
  return Array.from(map.entries())
    .map(([category, { sum, count, overdue }]) => ({
      category,
      count,
      avgRating: Math.round((sum / count) * 10) / 10,
      overdueCount: overdue,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

// ── Activity rating (closed rows only) ───────────────────────────────────────

export function computeActivityRating(activities: StudentActivityModel[]): number | null {
  const closed = activities.filter((a) => a.status === 'closed' && a.norm_rating != null);
  if (closed.length === 0) return null;
  const sum = closed.reduce((acc, a) => acc + a.norm_rating!, 0);
  return Math.round((sum / closed.length) * 10) / 10;
}

export function computeActivityCount(activities: StudentActivityModel[]): number {
  return activities.filter((a) => a.status === 'closed').length;
}

// ── Overall rating ────────────────────────────────────────────────────────────

export function computeOverallRating(
  academicRating: number | null,
  activityRating: number | null,
): number | null {
  if (academicRating == null && activityRating == null) return null;
  if (academicRating == null) return activityRating;
  if (activityRating == null) return academicRating;
  return Math.round((academicRating * 0.7 + activityRating * 0.3) * 10) / 10;
}

// ── Display helper ────────────────────────────────────────────────────────────

export function fmtRating(value: number | null): string {
  return value != null ? String(value) : '—';
}
