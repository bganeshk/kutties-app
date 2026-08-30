import { BaseRepository } from './base.repository';
import {
  TeacherAttendanceLogModel,
  toTeacherAttendanceLogModel,
} from '../models/teacherattendancelog.model';
import { SHEETS } from '../../utils/constants';

export class TeacherAttendanceLogRepository extends BaseRepository<TeacherAttendanceLogModel> {
  constructor() {
    super(SHEETS.TEACATTELOG);
  }

  protected fromRow(row: Record<string, unknown>): TeacherAttendanceLogModel {
    return toTeacherAttendanceLogModel(row);
  }

  protected toRow(item: TeacherAttendanceLogModel): Record<string, unknown> {
    return {
      teacherEmail:   item.teacherEmail,
      approved:       item.approved,
      leaveOption:    item.leaveOption,
      LeaveType:      item.leaveType,
      attendanceDate: item.attendanceDate,
      checkIn:        item.checkIn,
      checkOut:       item.checkOut,
      remarks:        item.remarks,
      Revision:       item.revision,
      Lastmodified:   new Date().toISOString(),
    };
  }

  async findByTeacher(teacherName: string): Promise<TeacherAttendanceLogModel[]> {
    return this.findWhere((r) =>
      String(r.teacherEmail ?? '').toLowerCase() === teacherName.toLowerCase(),
    );
  }

  async findByTeacherEmail(email: string): Promise<TeacherAttendanceLogModel[]> {
    return this.findWhere((r) =>
      String(r.teacherEmail ?? '').toLowerCase() === email.toLowerCase(),
    );
  }

  async search(query: string): Promise<TeacherAttendanceLogModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.teacherEmail, r.approved, r.leaveType, r.leaveOption, r.remarks]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const teacherAttendanceLogRepository = new TeacherAttendanceLogRepository();
