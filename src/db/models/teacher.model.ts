import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { AuditFields } from './audit.model';

// ── Drizzle table (native SQLite) ─────────────────────────────────────────
export const teachers = sqliteTable('teachers', {
  id:           text('id').primaryKey(),
  name:         text('name'),
  designation:  text('designation'),
  email:        text('email'),
  phone:        text('phone'),
  address:      text('address'),
  status:       text('status', { enum: ['active', 'inactive'] }),
  subjects:     text('subjects'),                 // comma-separated
  idphoto:      text('idphoto'),
  joiningDate:  text('joining_date'),
  remarks:      text('remarks'),
  lastmodified: text('lastmodified'),
  syncStatus:   text('sync_status', {
    enum: ['synced', 'pending_create', 'pending_update', 'pending_delete'],
  }).notNull().default('synced'),
});

// ── Inferred types ────────────────────────────────────────────────────────
export type Teacher    = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;

// ── Domain model (what the UI works with) ────────────────────────────────
export interface TeacherModel extends AuditFields {
  id: string;
  name?: string;
  designation?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
  subjects?: string;         // raw comma-separated string from Excel
  subjectList?: string[];    // parsed array (computed)
  idphoto?: string;
  joiningDate?: string;
  remarks?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────
export function parseSubjects(subjects?: string | unknown): string[] {
  if (!subjects) return [];
  const raw = typeof subjects === 'string' ? subjects : String(subjects);
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function toTeacherModel(row: Record<string, unknown>): TeacherModel {
  return {
    id:           String(row.id ?? ''),
    name:         row.name as string,
    designation:  row.designation as string,
    email:        row.email as string,
    phone:        row.phone as string,
    address:      row.address as string,
    status:       (String(row.status ?? '').toLowerCase() as 'active' | 'inactive') || undefined,
    subjects:     row.subjects as string,
    subjectList:  parseSubjects(row.subjects as string),
    idphoto:      row.idphoto as string,
    joiningDate:  row.joiningDate as string,
    remarks:      row.remarks as string,
    lastmodified: row.lastmodified as string,
  };
}
