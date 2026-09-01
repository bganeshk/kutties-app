import { BaseRepository } from './base.repository';
import {
  StudentDiaryModel,
  toStudentDiaryModel,
} from '../models/studentdiary.model';
import { SHEETS } from '../../utils/constants';

export class StudentDiaryRepository extends BaseRepository<StudentDiaryModel> {
  constructor() {
    super(SHEETS.STUDENT_DIARY);
  }

  protected fromRow(row: Record<string, unknown>): StudentDiaryModel {
    return toStudentDiaryModel(row);
  }

  protected toRow(item: StudentDiaryModel): Record<string, unknown> {
    return {
      Student:      item.regNumber,
      DiaryDate:    item.diaryDate,
      Response:     item.response,
      TeacherNote:  item.teacherNote,
      Category:     item.category,
      Rating:       item.rating,
      remarks:      item.remarks,
      CreatedBy:    item.createdBy,
      revision:     item.revision,
      lastmodified: new Date().toISOString(),
    };
  }

  /** All diary entries for a given student reg number */
  async findByStudent(regNumber: string): Promise<StudentDiaryModel[]> {
    return this.findWhere((r) =>
      String(r.regNumber ?? '').toLowerCase() === regNumber.toLowerCase(),
    );
  }

  async search(query: string): Promise<StudentDiaryModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.regNumber, r.response, r.teacherNote, r.category, r.remarks, r.createdBy]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const studentDiaryRepository = new StudentDiaryRepository();
