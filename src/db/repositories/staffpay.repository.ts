import { BaseRepository } from './base.repository';
import { StaffPayModel, toStaffPayModel } from '../models/staffpay.model';
import { SHEETS } from '../../utils/constants';

export class StaffPayRepository extends BaseRepository<StaffPayModel> {
  constructor() {
    super(SHEETS.STAFF_PAY);
  }

  protected fromRow(row: Record<string, unknown>): StaffPayModel {
    return toStaffPayModel(row);
  }

  protected toRow(item: StaffPayModel): Record<string, unknown> {
    return {
      'Recpt No':    item.recptNo,
      staff:         item.staff,
      'Pay Mode':    item.payMode,
      'Pay Month':   item.payMonth,
      Amount:        item.amount,
      'Pay Date':    item.payDate,
      Remarks:       item.remarks,
      revision:      item.revision,
      lastmodified:  new Date().toISOString(),
    };
  }

  /** All pay records for a given staff identifier */
  async findByStaff(staffId: string): Promise<StaffPayModel[]> {
    return this.findWhere((r) =>
      String(r.staff ?? '').toLowerCase() === staffId.toLowerCase(),
    );
  }

  async search(query: string): Promise<StaffPayModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.recptNo, r.staff, r.payMode, r.payMonth, r.remarks]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const staffPayRepository = new StaffPayRepository();
