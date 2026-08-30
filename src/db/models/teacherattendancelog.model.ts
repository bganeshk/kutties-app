import type { AuditFields } from './audit.model';
import { normaliseDate, normaliseDateTime } from './date.utils';

// ── Domain model ──────────────────────────────────────────────────────────────
// Excel columns: id, teacherEmail, approved, leaveOption, LeaveType,
//                attendanceDate, checkIn, checkOut, remarks, Lastmodified, Revision
// leaveOption: 'Present' | 'Half Day' | 'Full Day'
export interface TeacherAttendanceLogModel extends AuditFields {
  id: string;
  teacherEmail?: string;
  approved?: string;
  leaveOption?: string;   // 'Present' | 'Half Day' | 'Full Day'
  leaveType?: string;
  attendanceDate?: string;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
  revision?: string;
}

// ── Mapper ────────────────────────────────────────────────────────────────────
export function toTeacherAttendanceLogModel(
  row: Record<string, unknown>,
): TeacherAttendanceLogModel {
  return {
    id:            String(row.id ?? ''),
    teacherEmail:  (row.teacherEmail  ?? row.TeacherEmail)  as string | undefined,
    approved:      String(row.approved ?? row.Approved ?? '').trim() || undefined,
    leaveOption:   (row.leaveOption   ?? row.LeaveOption)   as string | undefined,
    leaveType:     (row.LeaveType     ?? row.leaveType)     as string | undefined,
    attendanceDate: normaliseDate(row.attendanceDate ?? row.AttendanceDate),
    checkIn:       normaliseDateTime(row.checkIn  ?? row.CheckIn),
    checkOut:      normaliseDateTime(row.checkOut ?? row.CheckOut),
    remarks:       (row.remarks   ?? row.Remarks)           as string | undefined,
    revision:      (row.Revision  ?? row.revision)          as string | undefined,
    lastmodified:  (row.Lastmodified ?? row.lastmodified)   as string | undefined,
  };
}
