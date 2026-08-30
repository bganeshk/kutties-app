import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Domain model ──────────────────────────────────────────────────────────────
// Excel sheet: stfee
// Columns: id, recpt_no, student, dueDate, feeType,
//          amount, paidDate, paymentMode, remarks,
//          status, Lastmodified, Revision
export interface StudentFeeModel extends AuditFields {
  id: string;
  recptNo?: string;      // Excel: recpt_no    — receipt number
  regNumber?: string;    // Excel: student     — student reg number
  dueDate?: string;      // Excel: dueDate
  feeType?: string;      // Excel: feeType
  amount?: number;       // Excel: amount
  paidDate?: string;     // Excel: paidDate
  paymentMode?: string;  // Excel: paymentMode
  remarks?: string;      // Excel: remarks
  status?: string;       // Excel: status
  revision?: number;     // Excel: Revision
}

// ── Mapper ────────────────────────────────────────────────────────────────────
export function toStudentFeeModel(row: Record<string, unknown>): StudentFeeModel {
  return {
    id:          String(row.id ?? row.Id ?? ''),
    recptNo:     (row.recpt_no   ?? row.recptNo)    as string | undefined,
    regNumber:   (row.student    ?? row.regNumber)  as string | undefined,
    dueDate:     normaliseDate(row.dueDate),
    feeType:     (row.feeType    ?? row.fee_type)   as string | undefined,
    amount:      row.amount != null ? Number(row.amount) : undefined,
    paidDate:    normaliseDate(row.paidDate),
    paymentMode: (row.paymentMode ?? row.payment_mode) as string | undefined,
    remarks:     (row.remarks    ?? row.Remarks)    as string | undefined,
    status:      (row.status     ?? row.Status)     as string | undefined,
    revision:    row.Revision != null ? Number(row.Revision) : row.revision != null ? Number(row.revision) : undefined,
    lastmodified:(row.Lastmodified ?? row.lastmodified) as string | undefined,
  };
}
