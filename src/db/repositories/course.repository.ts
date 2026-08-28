import { BaseRepository } from './base.repository';
import { CourseModel, toCourseModel, parseCourseSubjects } from '../models/course.model';

export class CourseRepository extends BaseRepository<CourseModel> {
  constructor() {
    super('courses');
  }

  protected fromRow(row: Record<string, unknown>): CourseModel {
    return toCourseModel(row);
  }

  protected toRow(item: CourseModel): Record<string, unknown> {
    return {
      courseName:     item.courseName,
      description:    item.description,
      subjects:       item.subjects,
      division:       item.division,
      classTeacher:   item.classTeacher,
      afterSchoolFee: item.afterSchoolFee,
      weekEndFee:     item.weekEndFee,
      admissionFee:   item.admissionFee,
      courseFee:      item.courseFee,
      bookFee:        item.bookFee,
      lastmodified:   new Date().toISOString(),
    };
  }

  async search(query: string): Promise<CourseModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((c) =>
      [c.courseName, c.description, c.classTeacher, c.division, c.subjects]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }

  async findByDivision(division: string): Promise<CourseModel[]> {
    return this.findWhere((c) => c.division === division);
  }

  async findBySubject(subject: string): Promise<CourseModel[]> {
    const q = subject.toLowerCase();
    return this.findWhere((c) =>
      parseCourseSubjects(c.subjects).some((s) => s.toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const courseRepository = new CourseRepository();
