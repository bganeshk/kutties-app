import { BaseRepository } from './base.repository';
import { StudentFeeModel, toStudentFeeModel } from '../models/studentfee.model';
import { SHEETS } from '../../utils/constants';

/** Convert a date string (dd/MMM/yyyy or YYYY-MM-DD) → "YYYY-MM". Returns '' when unparseable. */
function toMonthKey(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const mon: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const dm = dateStr.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dm) {
    const m = mon[dm[2].toLowerCase()];
    return m ? `${dm[3]}-${m}` : '';
  }
  const im = dateStr.match(/^(\d{4})-(\d{2})/);
  if (im) return `${im[1]}-${im[2]}`;
  return '';
}

export class StudentFeeRepository extends BaseRepository<StudentFeeModel> {
  constructor() {
    super(SHEETS.STUDENT_FEE);
  }

  protected fromRow(row: Record<string, unknown>): StudentFeeModel {
    return toStudentFeeModel(row);
  }

  protected toRow(item: StudentFeeModel): Record<string, unknown> {
    return {
      recpt_no:    item.recptNo,
      student:     item.regNumber,
      dueDate:     item.dueDate,
      feeType:     item.feeType,
      amount:      item.amount,
      paidDate:    item.paidDate,
      paymentMode: item.paymentMode,
      remarks:     item.remarks,
      status:      item.status,
      Revision:    item.revision,
      Lastmodified: new Date().toISOString(),
    };
  }

  /** All fee records for a given student reg number */
  async findByStudent(regNumber: string): Promise<StudentFeeModel[]> {
    return this.findWhere((r) =>
      String(r.regNumber ?? '').toLowerCase() === regNumber.toLowerCase(),
    );
  }

  /**
   * All fee records (paid and unpaid) whose dueDate falls in [fromKey, toKey] (both inclusive,
   * "YYYY-MM"), plus records with no dueDate (treated as current month by callers).
   */
  async findByMonthRange(fromKey: string, toKey: string): Promise<StudentFeeModel[]> {
    return this.findWhere((r) => {
      const due = (r.dueDate ?? '').trim();
      if (!due) return true;
      const mk = toMonthKey(due);
      return !!mk && mk >= fromKey && mk <= toKey;
    });
  }

  /**
   * Pending/partial fee records relevant to the [fromKey, toKey] window (both inclusive, "YYYY-MM").
   *
   * A record is included when it is NOT paid (pending/partial), its dueDate falls in
   * the window, OR its dueDate is null/empty (no due date set yet).
   *
   * Paid records are excluded entirely.
   */
  async findPendingByMonthRange(fromKey: string, toKey: string): Promise<StudentFeeModel[]> {
    return this.findWhere((r) => {
      const isPaid = (r.status ?? '').trim().toLowerCase() === 'paid';
      if (isPaid) return false;
      const due = (r.dueDate ?? '').trim();
      if (!due) return true;
      const mk = toMonthKey(due);
      return !!mk && mk >= fromKey && mk <= toKey;
    });
  }

  async search(query: string): Promise<StudentFeeModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.recptNo, r.regNumber, r.feeType, r.status, r.paymentMode, r.remarks]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const studentFeeRepository = new StudentFeeRepository();
