import { BaseRepository } from './base.repository';
import { ExpenseModel, toExpenseModel } from '../models/expense.model';
import { SHEETS } from '../../utils/constants';

export class ExpenseRepository extends BaseRepository<ExpenseModel> {
  constructor() {
    super(SHEETS.EXPENSE);
  }

  protected fromRow(row: Record<string, unknown>): ExpenseModel {
    return toExpenseModel(row);
  }

  protected toRow(item: ExpenseModel): Record<string, unknown> {
    return {
      'Recpt No':     item.recptNo,
      'Expense Date': item.expenseDate,
      'Expense Type': item.expenseType,
      'Payment Mode': item.paymentMode,
      Amount:         item.amount,
      'Paid To':      item.paidTo,
      Description:    item.description,
      Remarks:        item.remarks,
      revision:       item.revision,
      lastmodified:   new Date().toISOString(),
    };
  }

  /** All expense records for a given expenseType (case-insensitive) */
  async findByType(type: string): Promise<ExpenseModel[]> {
    return this.findWhere((r) =>
      String(r.expenseType ?? '').toLowerCase() === type.toLowerCase(),
    );
  }

  /**
   * All expense records whose expenseDate starts with the given month prefix.
   * @param month - e.g. "2024-06"
   */
  async findByMonth(month: string): Promise<ExpenseModel[]> {
    return this.findWhere((r) =>
      String(r.expenseDate ?? '').startsWith(month),
    );
  }

  /** Full-text search across key fields */
  async search(query: string): Promise<ExpenseModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.recptNo, r.expenseType, r.paymentMode, r.paidTo, r.remarks]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const expenseRepository = new ExpenseRepository();
