import { BaseRepository } from './base.repository';
import { StudentMarkSheetModel, toStudentMarkSheetModel } from '../models/studentmarksheet.model';
import { SHEETS } from '../../utils/constants';

export class StudentMarkSheetRepository extends BaseRepository<StudentMarkSheetModel> {
  constructor() {
    super(SHEETS.STUDENT_MARK_SHEET);
  }

  protected fromRow(row: Record<string, unknown>): StudentMarkSheetModel {
    return toStudentMarkSheetModel(row);
  }

  protected toRow(item: StudentMarkSheetModel): Record<string, unknown> {
    return {
      Student:        item.regNumber,
      ExamName:       item.examName,
      ExamDate:       item.examDate,
      Subject:        item.subject,
      SubjTeacher:    item.subjTeacher,
      MaxMarks:       item.maxMarks,
      MarksObtained:  item.marksObtained,
      Grade:          item.grade,
      Remarks:        item.remarks,
      RecordedBy:     item.recordedBy,
      Revision:       item.revision,
      Lastmodified:   new Date().toISOString(),
    };
  }

  /** All mark records for a given student reg number */
  async findByStudent(regNumber: string): Promise<StudentMarkSheetModel[]> {
    return this.findWhere(
      (r) => String(r.regNumber ?? '').toLowerCase() === regNumber.toLowerCase(),
    );
  }

  /** All mark records for a given student + exam name */
  async findByStudentAndExam(
    regNumber: string,
    examName: string,
  ): Promise<StudentMarkSheetModel[]> {
    return this.findWhere(
      (r) =>
        String(r.regNumber ?? '').toLowerCase() === regNumber.toLowerCase() &&
        String(r.examName  ?? '').toLowerCase() === examName.toLowerCase(),
    );
  }

  async search(query: string): Promise<StudentMarkSheetModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.regNumber, r.examName, r.subject, r.grade, r.remarks, r.recordedBy]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const studentMarkSheetRepository = new StudentMarkSheetRepository();
