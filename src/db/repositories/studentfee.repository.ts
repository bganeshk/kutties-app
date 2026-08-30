import { BaseRepository } from './base.repository';
import { StudentFeeModel, toStudentFeeModel } from '../models/studentfee.model';
import { SHEETS } from '../../utils/constants';

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
