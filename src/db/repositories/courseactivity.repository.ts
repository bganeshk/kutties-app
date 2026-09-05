import { BaseRepository } from './base.repository';
import {
  CourseActivityModel,
  toCourseActivityModel,
  serializeCourseAttachments,
} from '../models/courseactivity.model';
import { SHEETS } from '../../utils/constants';

export class CourseActivityRepository extends BaseRepository<CourseActivityModel> {
  constructor() {
    super(SHEETS.COURSE_ACTIVITY);
  }

  protected fromRow(row: Record<string, unknown>): CourseActivityModel {
    return toCourseActivityModel(row);
  }

  protected toRow(item: CourseActivityModel): Record<string, unknown> {
    return {
      ActivityType:          item.activityType,
      Scope:                 item.scope,
      Course:                item.course,
      Category:              item.category,
      Title:                 item.title,
      Description:           item.description,
      StartDate:             item.startDate,
      EndDate:               item.endDate,
      Assignor:              item.assignor,
      Assignee:              item.assignee,
      Coordinator:           item.coordinator,
      Reviewer:              item.reviewer,
      GradingTarget:         item.gradingTarget,
      Status:                item.status,
      IsOverdue:             item.isOverdue != null ? String(item.isOverdue) : undefined,
      SubmissionAttachments: serializeCourseAttachments(item.submissionAttachments),
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

  /** All activities for a given course. */
  async findByCourse(course: string): Promise<CourseActivityModel[]> {
    return this.findWhere(
      (r) => String(r.course ?? '').toLowerCase() === course.toLowerCase(),
    );
  }

  /** All activities with scope = 'school'. */
  async findSchoolWide(): Promise<CourseActivityModel[]> {
    return this.findWhere((r) => r.scope === 'school');
  }

  /** All activities assigned to a teacher (coordinator). */
  async findByAssignee(email: string): Promise<CourseActivityModel[]> {
    return this.findWhere(
      (r) => String(r.assignee ?? '').toLowerCase() === email.toLowerCase(),
    );
  }

  /** All activities created by a staff member. */
  async findByAssignor(email: string): Promise<CourseActivityModel[]> {
    return this.findWhere(
      (r) => String(r.assignor ?? '').toLowerCase() === email.toLowerCase(),
    );
  }

  /** Activities assigned to a reviewer. */
  async findByReviewer(email: string): Promise<CourseActivityModel[]> {
    return this.findWhere(
      (r) => String(r.reviewer ?? '').toLowerCase() === email.toLowerCase(),
    );
  }

  /** All activities with a specific status. */
  async findByStatus(status: string): Promise<CourseActivityModel[]> {
    return this.findWhere(
      (r) => String(r.status ?? '').toLowerCase() === status.toLowerCase(),
    );
  }

  /** Overdue activities (not yet closed). */
  async findOverdue(): Promise<CourseActivityModel[]> {
    return this.findWhere((r) => !!r.isOverdue && r.status !== 'closed');
  }

  async search(query: string): Promise<CourseActivityModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.title, r.assignee, r.assignor, r.course, r.category, r.activityType, r.status, r.scope]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const courseActivityRepository = new CourseActivityRepository();
