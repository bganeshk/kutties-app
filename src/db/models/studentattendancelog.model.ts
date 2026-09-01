import type { AuditFields } from './audit.model';
import { normaliseDate, normaliseDateTime } from './date.utils';

// ── Domain model ──────────────────────────────────────────────────────────────
// Excel columns (StudentAttendanceLog sheet):
//   id, regNumber, leaveOption, leaveType, attendanceDate,
//   checkIn, checkOut, accompaniedBy, markedBy, remarks,
//   lastmodified, revision, approved
export interface StudentAttendanceLogModel extends AuditFields {
  id: string;
  regNumber?: string;
  leaveOption?: string;    // 'Present' | 'Half Day' | 'Full Day'
  leaveType?: string;
  attendanceDate?: string;
  checkIn?: string;
  checkOut?: string;
  accompaniedBy?: string;
  markedBy?: string;
  remarks?: string;
  revision?: string;
  approved?: string;
}

// ── Mapper ────────────────────────────────────────────────────────────────────
export function toStudentAttendanceLogModel(
  row: Record<string, unknown>,
): StudentAttendanceLogModel {
  return {
    id:             String(row.id ?? ''),
    regNumber:      (row.regNumber      ?? row.RegNumber)      as string | undefined,
    leaveOption:    (row.leaveOption    ?? row.LeaveOption)    as string | undefined,
    leaveType:      (row.leaveType      ?? row.LeaveType)      as string | undefined,
    attendanceDate: normaliseDate(row.attendanceDate ?? row.AttendanceDate),
    checkIn:        normaliseDateTime(row.checkIn  ?? row.CheckIn),
    checkOut:       normaliseDateTime(row.checkOut ?? row.CheckOut),
    accompaniedBy:  (row.accompaniedBy  ?? row.AccompaniedBy)  as string | undefined,
    markedBy:       (row.markedBy       ?? row.MarkedBy)       as string | undefined,
    remarks:        (row.remarks        ?? row.Remarks)        as string | undefined,
    revision:       (row.revision       ?? row.Revision)       as string | undefined,
    approved:       String(row.approved ?? row.Approved ?? '').trim() || undefined,
    lastmodified:   (row.lastmodified   ?? row.Lastmodified)   as string | undefined,
  };
}
