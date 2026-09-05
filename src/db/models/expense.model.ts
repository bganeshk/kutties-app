import { normaliseDate } from './date.utils';

// ── Domain model ──────────────────────────────────────────────────────────────
// Excel sheet: expenses
// Columns: id, Recpt No, Expense Date, Expense Type, Payment Mode, Amount,
//          Paid To, Description, Remarks, revision, lastmodified
export interface ExpenseModel {
  id:           string;
  recptNo?:     string;   // Excel: Recpt No
  expenseDate?: string;   // Excel: Expense Date — ISO date YYYY-MM-DD
  expenseType?: string;   // Excel: Expense Type
  paymentMode?: string;   // Excel: Payment Mode
  amount?:      number;   // Excel: Amount
  paidTo?:      string;   // Excel: Paid To
  description?: string;   // Excel: Description
  remarks?:     string;   // Excel: Remarks
  revision?:    number;   // Excel: revision
  lastmodified?:string;   // Excel: lastmodified
}

// ── Mapper ────────────────────────────────────────────────────────────────────
export function toExpenseModel(row: Record<string, unknown>): ExpenseModel {
  return {
    id:           String(row.id ?? row.Id ?? ''),
    recptNo:      (row['Recpt No']     ?? row.recptNo)     as string | undefined,
    expenseDate:  normaliseDate(row['Expense Date'] ?? row.expenseDate),
    expenseType:  (row['Expense Type'] ?? row.expenseType) as string | undefined,
    paymentMode:  (row['Payment Mode'] ?? row.paymentMode) as string | undefined,
    amount:       row.Amount != null ? Number(row.Amount) : row.amount != null ? Number(row.amount) : undefined,
    paidTo:       (row['Paid To']      ?? row.paidTo)      as string | undefined,
    description:  (row.Description    ?? row.description)  as string | undefined,
    remarks:      (row.Remarks         ?? row.remarks)      as string | undefined,
    revision:     row.revision != null ? Number(row.revision) : undefined,
    lastmodified: (row.lastmodified    ?? row.Lastmodified) as string | undefined,
  };
}
