import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Drizzle table (native SQLite) ─────────────────────────────────────────
export const students = sqliteTable('students', {
  id:           text('id').primaryKey(),
  regNumber:    text('reg_number'),
  fullName:     text('full_name'),
  motherName:   text('mother_name'),
  fatherName:   text('father_name'),
  address:      text('address'),
  phone:        text('phone'),
  phone2:       text('phone2'),
  dob:          text('dob'),
  email:        text('email'),
  status:       text('status', { enum: ['active', 'inactive','Alumini','Graduated'] }),
  course:       text('course'),
  afterSchool:  text('after_school'),
  optWeekend:   text('opt_weekend'),
  idphoto:      text('idphoto'),
  admissionDate: text('admission_date'),
  lastmodified: text('lastmodified'),
  syncStatus:   text('sync_status', {
    enum: ['synced', 'pending_create', 'pending_update', 'pending_delete'],
  }).notNull().default('synced'),
});

// ── Inferred types ────────────────────────────────────────────────────────
export type Student    = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

// ── Domain model (what the UI works with) ────────────────────────────────
export interface StudentModel extends AuditFields {
  id: string;
  regNumber?: string;
  fullName?: string;
  motherName?: string;
  fatherName?: string;
  address?: string;
  phone?: string;
  phone2?: string;
  dob?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'Alumini' | 'Graduated';
  course?: string;
  afterSchool?: string;
  optWeekend?: string;
  idphoto?: string;
  admissionDate?: string;
}

// ── Mapper — handles both raw API keys (PascalCase) and local DB keys ─────
export function toStudentModel(row: Record<string, unknown>): StudentModel {
  const status = String(row.Status ?? row.status ?? '').toLowerCase();
  return {
    id:           String(row.Id ?? row.id ?? ''),
    regNumber:    (row.RegNumber ?? row.regNumber) as string | undefined,
    fullName:     (row.FullName  ?? row.fullName)  as string | undefined,
    motherName:   (row.MotherName ?? row.motherName ?? row.mother_name) as string | undefined,
    fatherName:   (row.FatherName ?? row.fatherName ?? row.father_name) as string | undefined,
    address:      (row.ContactAddress ?? row.address) as string | undefined,
    phone:        (row.phone_1 ?? row.phone)  as string | undefined,
    phone2:       (row.phone_2 ?? row.phone2) as string | undefined,
    dob:          normaliseDate(row.DoB ?? row.dob),
    email:        (row.emailId ?? row.email)  as string | undefined,
    status:       (['active', 'inactive', 'alumini', 'graduated'].includes(status)
      ? (status === 'alumini' ? 'Alumini' : status === 'graduated' ? 'Graduated' : status)
      : 'active') as 'active' | 'inactive' | 'Alumini' | 'Graduated',
    course:       (row.Course ?? row.course)  as string | undefined,
    afterSchool:  (row.AfterSchool ?? row.afterSchool) as string | undefined,
    optWeekend:   (row['Opt Weekend'] ?? row.optWeekend) as string | undefined,
    idphoto:      (row.IdPhoto ?? row.idphoto) as string | undefined,
    admissionDate: normaliseDate(row.AdmissionDt ?? row.admissionDate),
    lastmodified: (row.Lastmodified ?? row.lastmodified) as string | undefined,
  };
}
