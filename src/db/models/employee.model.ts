import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { AuditFields } from './audit.model';

// ── Drizzle table (native SQLite) ─────────────────────────────────────────
export const employees = sqliteTable('employees', {
  id:           text('id').primaryKey(),
  name:         text('name'),
  designation:  text('designation'),
  department:   text('department'),
  email:        text('email'),
  phone:        text('phone'),
  address:      text('address'),
  status:       text('status', { enum: ['active', 'inactive'] }),
  idphoto:      text('idphoto'),
  joiningDate:  text('joining_date'),
  lastmodified: text('lastmodified'),
  syncStatus:   text('sync_status', {
    enum: ['synced', 'pending_create', 'pending_update', 'pending_delete'],
  }).notNull().default('synced'),
});

// ── Inferred types ────────────────────────────────────────────────────────
export type Employee    = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

// ── Domain model (what the UI works with) ────────────────────────────────
export interface EmployeeModel extends AuditFields {
  id: string;
  name?: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
  idphoto?: string;
  joiningDate?: string;
}

export function toEmployeeModel(row: Record<string, unknown>): EmployeeModel {
  return {
    id:           String(row.id ?? ''),
    name:         row.name as string,
    designation:  row.designation as string,
    department:   row.department as string,
    email:        row.email as string,
    phone:        row.phone as string,
    address:      row.address as string,
    status:       (String(row.status ?? '').toLowerCase() as 'active' | 'inactive') || undefined,
    idphoto:      row.idphoto as string,
    joiningDate:  row.joiningDate as string,
    lastmodified: row.lastmodified as string,
  };
}
