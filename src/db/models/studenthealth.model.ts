import type { AuditFields } from './audit.model';
import { normaliseDate } from './date.utils';

// ── Domain model ──────────────────────────────────────────────────────────────
// Excel sheet: student_health_report
// Columns: id, CheckupDate, Student (RegNumber – unique per student),
//          height, weight, Prescription, remarks, revision, lastmodified,
//          bloodGroup, allergies, medicalConditions, medications
export interface StudentHealthModel extends AuditFields {
  id: string;
  regNumber?: string;        // Excel: Student — unique registration number
  checkupDate?: string;      // Excel: CheckupDate
  height?: number;           // Excel: height
  weight?: number;           // Excel: weight
  prescription?: string;     // Excel: Prescription
  bloodGroup?: string;       // Excel: bloodGroup
  allergies?: string;        // Excel: allergies
  medicalConditions?: string; // Excel: medicalConditions
  medications?: string;      // Excel: medications
  remarks?: string;          // Excel: remarks
  revision?: number;         // Excel: revision
}

// ── Mapper ────────────────────────────────────────────────────────────────────
export function toStudentHealthModel(
  row: Record<string, unknown>,
): StudentHealthModel {
  return {
    id:                String(row.id ?? row.Id ?? ''),
    regNumber:         (row.Student ?? row.regNumber ?? row.RegNumber) as string | undefined,
    checkupDate:       normaliseDate(row.CheckupDate ?? row.checkupDate),
    height:            row.height != null ? Number(row.height) : undefined,
    weight:            row.weight != null ? Number(row.weight) : undefined,
    prescription:      (row.Prescription ?? row.prescription) as string | undefined,
    bloodGroup:        (row.bloodGroup   ?? row.BloodGroup)   as string | undefined,
    allergies:         (row.allergies    ?? row.Allergies)    as string | undefined,
    medicalConditions: (row.medicalConditions ?? row.MedicalConditions) as string | undefined,
    medications:       (row.medications  ?? row.Medications)  as string | undefined,
    remarks:           (row.remarks      ?? row.Remarks)      as string | undefined,
    revision:          row.revision != null ? Number(row.revision) : undefined,
    lastmodified:      (row.lastmodified ?? row.Lastmodified) as string | undefined,
  };
}
