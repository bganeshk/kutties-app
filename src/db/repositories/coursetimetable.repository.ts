import { BaseRepository } from './base.repository';
import { CourseTimeTableModel, toCourseTimeTableModel } from '../models/coursetimetable.model';
import { SHEETS } from '../../utils/constants';

export class CourseTimeTableRepository extends BaseRepository<CourseTimeTableModel> {
  constructor() {
    super(SHEETS.COURSE_TIMETABLE);
  }

  protected fromRow(row: Record<string, unknown>): CourseTimeTableModel {
    return toCourseTimeTableModel(row);
  }

  protected toRow(item: CourseTimeTableModel): Record<string, unknown> {
    return {
      courseDivision:  item.courseDivision,
      day:             item.day,
      subject:         item.subject,   // stored as camelCase in SQLite
      teacher:         item.teacher,
      startTime:       item.startTime,
      endTime:         item.endTime,
      notes:           item.notes,
      lastmodified:    new Date().toISOString(),
    };
  }

  async findByCourseDivision(courseDivision: string): Promise<CourseTimeTableModel[]> {
    return this.findWhere((r) => r.courseDivision === courseDivision);
  }

  async findByDay(day: string): Promise<CourseTimeTableModel[]> {
    return this.findWhere((r) => r.day === day);
  }

  async search(query: string): Promise<CourseTimeTableModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.courseDivision, r.day, r.subject, r.teacher, r.notes]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const courseTimeTableRepository = new CourseTimeTableRepository();
