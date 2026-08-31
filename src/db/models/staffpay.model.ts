import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Domain model ──────────────────────────────────────────────────────────────
// Excel sheet: staffpay
// Columns: id, Recpt No, staff, Pay Mode, Pay Month, Amount, Pay Date, Remarks, revision, lastmodified
export interface StaffPayModel extends AuditFields {
  id: string;
  recptNo?: string;    // Excel: Recpt No
  staff?: string;      // Excel: staff  — staff name / email
  payMode?: string;    // Excel: Pay Mode
  payMonth?: string;   // Excel: Pay Month
  amount?: number;     // Excel: Amount
  payDate?: string;    // Excel: Pay Date
  remarks?: string;    // Excel: Remarks
  revision?: number;   // Excel: revision
}

// ── Mapper ────────────────────────────────────────────────────────────────────
export function toStaffPayModel(row: Record<string, unknown>): StaffPayModel {
  return {
    id:          String(row.id ?? row.Id ?? ''),
    recptNo:     (row['Recpt No'] ?? row.recptNo ?? row.recpt_no) as string | undefined,
    staff:       (row.staff ?? row.Staff) as string | undefined,
    payMode:     (row['Pay Mode'] ?? row.payMode ?? row.pay_mode) as string | undefined,
    payMonth:    (row['Pay Month'] ?? row.payMonth ?? row.pay_month) as string | undefined,
    amount:      row.Amount != null ? Number(row.Amount) : row.amount != null ? Number(row.amount) : undefined,
    payDate:     normaliseDate(row['Pay Date'] ?? row.payDate ?? row.pay_date),
    remarks:     (row.Remarks ?? row.remarks) as string | undefined,
    revision:    row.revision != null ? Number(row.revision) : undefined,
    lastmodified:(row.lastmodified ?? row.Lastmodified) as string | undefined,
  };
}
