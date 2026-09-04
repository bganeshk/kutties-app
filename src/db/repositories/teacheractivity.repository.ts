import { BaseRepository } from './base.repository';
import {
  TeacherActivityModel,
  toTeacherActivityModel,
  serializeTeacherAttachments,
} from '../models/teacheractivity.model';
import { SHEETS } from '../../utils/constants';

export class TeacherActivityRepository extends BaseRepository<TeacherActivityModel> {
  constructor() {
    super(SHEETS.TEACHER_ACTIVITY);
  }

  protected fromRow(row: Record<string, unknown>): TeacherActivityModel {
    return toTeacherActivityModel(row);
  }

  protected toRow(item: TeacherActivityModel): Record<string, unknown> {
    return {
      ActivityType:          item.activityType,
      Category:              item.category,
      Course:                item.course,
      Assignor:              item.assignor,
      Assignee:              item.assignee,
      Reviewer:              item.reviewer,
      Title:                 item.title,
      Description:           item.description,
      StartDate:             item.startDate,
      EndDate:               item.endDate,
      Status:                item.status,
      IsOverdue:             item.isOverdue != null ? String(item.isOverdue) : undefined,
      SubmissionAttachments: serializeTeacherAttachments(item.submissionAttachments),
      SubmissionNote:        item.submissionNote,
      Rating:                item.rating,
      RatingNote:            item.ratingNote,
      ClosedBy:              item.closedBy,
      ClosedAt:              item.closedAt,
      norm_rating:           item.norm_rating,
      Revision:              item.revision,
      Lastmodified:          new Date().toISOString(),
    };
  }

  /** All activities assigned to a teacher (by email). */
  async findByAssignee(email: string): Promise<TeacherActivityModel[]> {
    return this.findWhere(
      (r) => String(r.assignee ?? '').toLowerCase() === email.toLowerCase(),
    );
  }

  /** All activities created by a staff member. */
  async findByAssignor(email: string): Promise<TeacherActivityModel[]> {
    return this.findWhere(
      (r) => String(r.assignor ?? '').toLowerCase() === email.toLowerCase(),
    );
  }

  /** Activities assigned to a reviewer. */
  async findByReviewer(email: string): Promise<TeacherActivityModel[]> {
    return this.findWhere(
      (r) => String(r.reviewer ?? '').toLowerCase() === email.toLowerCase(),
    );
  }

  /** All activities for a given course. */
  async findByCourse(course: string): Promise<TeacherActivityModel[]> {
    return this.findWhere(
      (r) => String(r.course ?? '').toLowerCase() === course.toLowerCase(),
    );
  }

  /** All activities with a specific status. */
  async findByStatus(status: string): Promise<TeacherActivityModel[]> {
    return this.findWhere(
      (r) => String(r.status ?? '').toLowerCase() === status.toLowerCase(),
    );
  }

  /** Combined filter: course + teacher. */
  async findByCourseAndTeacher(
    course: string,
    email: string,
  ): Promise<TeacherActivityModel[]> {
    return this.findWhere(
      (r) =>
        String(r.course   ?? '').toLowerCase() === course.toLowerCase() &&
        String(r.assignee ?? '').toLowerCase() === email.toLowerCase(),
    );
  }

  /** Overdue activities (not yet closed). */
  async findOverdue(): Promise<TeacherActivityModel[]> {
    return this.findWhere((r) => !!r.isOverdue && r.status !== 'closed');
  }

  async search(query: string): Promise<TeacherActivityModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.title, r.assignee, r.assignor, r.course, r.category, r.activityType, r.status]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const teacherActivityRepository = new TeacherActivityRepository();
