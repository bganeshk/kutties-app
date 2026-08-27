import { BaseRepository } from './base.repository';
import { StudentModel, toStudentModel } from '../models/student.model';

export class StudentRepository extends BaseRepository<StudentModel> {
  constructor() {
    super('students');
  }

  protected fromRow(row: Record<string, unknown>): StudentModel {
    return toStudentModel(row);
  }

  protected toRow(item: StudentModel): Record<string, unknown> {
    return {
      regNumber:    item.regNumber,
      fullName:     item.fullName,
      motherName:   item.motherName,
      fatherName:   item.fatherName,
      address:      item.address,
      phone:        item.phone,
      dob:          item.dob,
      email:        item.email,
      status:       item.status,
      course:       item.course,
      afterSchool:  item.afterSchool,
      optWeekend:   item.optWeekend,
      idphoto:      item.idphoto,
      admissionDate: item.admissionDate,
      lastmodified: new Date().toISOString(),
    };
  }

  async findActive(): Promise<StudentModel[]> {
    return this.findWhere(s => s.status === 'active');
  }

  async findInactive(): Promise<StudentModel[]> {
    return this.findWhere(s => s.status !== 'active');
  }

  async findByCourse(course: string): Promise<StudentModel[]> {
    const q = course.toLowerCase();
    return this.findWhere(s => String(s.course ?? '').toLowerCase().includes(q));
  }

  async search(query: string): Promise<StudentModel[]> {
    const q = query.toLowerCase();
    return this.findWhere(s =>
      [s.fullName, s.regNumber, s.email, s.phone, s.course, s.motherName, s.fatherName]
        .some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }
}

export const studentRepository = new StudentRepository();
