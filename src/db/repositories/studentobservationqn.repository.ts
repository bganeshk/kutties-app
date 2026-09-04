import { BaseRepository } from './base.repository';
import {
  StudentObservationQnModel,
  toStudentObservationQnModel,
} from '../models/studentobservationqn.model';
import { SHEETS } from '../../utils/constants';

export class StudentObservationQnRepository extends BaseRepository<StudentObservationQnModel> {
  constructor() {
    super(SHEETS.STUDENT_OBSERVATION_QN);
  }

  protected fromRow(row: Record<string, unknown>): StudentObservationQnModel {
    return toStudentObservationQnModel(row);
  }

  protected toRow(item: StudentObservationQnModel): Record<string, unknown> {
    return {
      Question:  item.question,
      Category:  item.category,
      SortOrder: item.sortOrder,
      Active:    item.active,
      course:    item.course,
    };
  }

  /**
   * Active questions applicable to a given course.
   * A question is included when:
   *   - active === true  AND
   *   - q.course === 'all' (case-insensitive)  OR  q.course matches studentCourse exactly (case-insensitive)
   *
   * Pass undefined / '' to get all active questions regardless of course (admin list view).
   */
  async findActive(studentCourse?: string): Promise<StudentObservationQnModel[]> {
    const all = await this.findAll();
    return all
      
      .sort((a, b) => {
        const orderDiff = (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
        if (orderDiff !== 0) return orderDiff;
        return (a.question ?? '').localeCompare(b.question ?? '');
      });
  }
}

export const studentObservationQnRepository = new StudentObservationQnRepository();
