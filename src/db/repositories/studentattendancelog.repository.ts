import { BaseRepository } from './base.repository';
import {
  StudentAttendanceLogModel,
  toStudentAttendanceLogModel,
} from '../models/studentattendancelog.model';
import { SHEETS } from '../../utils/constants';

export class StudentAttendanceLogRepository extends BaseRepository<StudentAttendanceLogModel> {
  constructor() {
    super(SHEETS.STUDENT_ATT_LOG);
  }

  protected fromRow(row: Record<string, unknown>): StudentAttendanceLogModel {
    return toStudentAttendanceLogModel(row);
  }

  protected toRow(item: StudentAttendanceLogModel): Record<string, unknown> {
    return {
      regNumber:      item.regNumber,
      leaveOption:    item.leaveOption,
      leaveType:      item.leaveType,
      attendanceDate: item.attendanceDate,
      checkIn:        item.checkIn,
      checkOut:       item.checkOut,
      accompaniedBy:  item.accompaniedBy,
      markedBy:       item.markedBy,
      remarks:        item.remarks,
      revision:       item.revision,
      approved:       item.approved,
      lastmodified:   new Date().toISOString(),
    };
  }

  async findByRegNumber(regNumber: string): Promise<StudentAttendanceLogModel[]> {
    return this.findWhere((r) =>
      String(r.regNumber ?? '').toLowerCase() === regNumber.toLowerCase(),
    );
  }

  async search(query: string): Promise<StudentAttendanceLogModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.regNumber, r.leaveOption, r.leaveType, r.accompaniedBy, r.markedBy, r.remarks]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const studentAttendanceLogRepository = new StudentAttendanceLogRepository();
