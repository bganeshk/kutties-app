import { BaseRepository } from './base.repository';
import {
  StudentHealthModel,
  toStudentHealthModel,
} from '../models/studenthealth.model';
import { SHEETS } from '../../utils/constants';

export class StudentHealthRepository extends BaseRepository<StudentHealthModel> {
  constructor() {
    super(SHEETS.STUDENT_HEALTH);
  }

  protected fromRow(row: Record<string, unknown>): StudentHealthModel {
    return toStudentHealthModel(row);
  }

  protected toRow(item: StudentHealthModel): Record<string, unknown> {
    return {
      regNumber:          item.regNumber,
      CheckupDate:        item.checkupDate,
      height:             item.height,
      weight:             item.weight,
      Prescription:       item.prescription,
      bloodGroup:         item.bloodGroup,
      allergies:          item.allergies,
      medicalConditions:  item.medicalConditions,
      medications:        item.medications,
      remarks:            item.remarks,
      revision:           item.revision,
      lastmodified:       new Date().toISOString(),
    };
  }

  /** All health records for a given student reg number */
  async findByStudent(regNumber: string): Promise<StudentHealthModel[]> {
    return this.findWhere((r) =>
      String(r.regNumber ?? '').toLowerCase() === regNumber.toLowerCase(),
    );
  }

  async search(query: string): Promise<StudentHealthModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.regNumber, r.bloodGroup, r.allergies, r.medicalConditions, r.remarks]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const studentHealthRepository = new StudentHealthRepository();
