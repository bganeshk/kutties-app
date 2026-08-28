import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Drizzle table (native SQLite) ─────────────────────────────────────────
export const courses = sqliteTable('courses', {
  id:             text('id').primaryKey(),
  courseName:     text('course_name'),
  description:    text('description'),
  subjects:       text('subjects').notNull(),   // comma-separated
  division:       text('division').notNull(),
  classTeacher:   text('class_teacher'),
  afterSchoolFee: real('after_school_fee'),
  weekEndFee:     real('week_end_fee'),
  admissionFee:   real('admission_fee').notNull(),
  courseFee:      real('course_fee').notNull(),
  bookFee:        text('book_fee'),
  lastmodified:   text('lastmodified'),
  syncStatus:     text('sync_status', {
    enum: ['synced', 'pending_create', 'pending_update', 'pending_delete'],
  }).notNull().default('synced'),
});

// ── Inferred types ────────────────────────────────────────────────────────
export type Course    = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

// ── Domain model (what the UI works with) ────────────────────────────────
export interface CourseModel extends AuditFields {
  id: string;
  courseName?: string;
  description?: string;
  subjects: string;           // raw comma-separated (mandatory)
  subjectList: string[];      // parsed array (computed, mandatory)
  division: string;           // mandatory
  classTeacher?: string;
  afterSchoolFee?: number;
  weekEndFee?: number;
  admissionFee: number;       // mandatory
  courseFee: number;          // mandatory
  bookFee?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────
export function parseCourseSubjects(subjects?: string | unknown): string[] {
  if (!subjects) return [];
  const raw = typeof subjects === 'string' ? subjects : String(subjects);
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

// ── Mapper — handles both raw API keys (PascalCase) and local DB keys ─────
export function toCourseModel(row: Record<string, unknown>): CourseModel {
  const subjectsRaw = String(row.Subjects ?? row.subjects ?? '');
  return {
    id:             String(row.id ?? ''),
    courseName:     (row.CourseName  ?? row.courseName)   as string | undefined,
    description:    (row.Description ?? row.description)  as string | undefined,
    subjects:       subjectsRaw,
    subjectList:    parseCourseSubjects(subjectsRaw),
    division:       String(row.Division ?? row.division ?? ''),
    classTeacher:   (row.ClassTeacher ?? row.classTeacher) as string | undefined,
    afterSchoolFee: Number(row.AfterSchoolFee ?? row.afterSchoolFee ?? 0) || undefined,
    weekEndFee:     Number(row.WeekEndFee     ?? row.weekEndFee     ?? 0) || undefined,
    admissionFee:   Number(row.admissionfee   ?? row.admissionFee   ?? 0),
    courseFee:      Number(row.coursefee      ?? row.courseFee      ?? 0),
    bookFee:        (row.bookfee ?? row.bookFee) as string | undefined,
    lastmodified:   normaliseDate(row.Lastmodified ?? row.lastmodified),
  };
}
