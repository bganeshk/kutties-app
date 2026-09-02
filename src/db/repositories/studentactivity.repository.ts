import { BaseRepository } from './base.repository';
import {
  StudentActivityModel,
  toStudentActivityModel,
  serializeAttachments,
} from '../models/studentactivity.model';
import { SHEETS } from '../../utils/constants';

export class StudentActivityRepository extends BaseRepository<StudentActivityModel> {
  constructor() {
    super(SHEETS.STUDENT_ACTIVITY);
  }

  protected fromRow(row: Record<string, unknown>): StudentActivityModel {
    return toStudentActivityModel(row);
  }

  protected toRow(item: StudentActivityModel): Record<string, unknown> {
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
      SubmissionAttachments: serializeAttachments(item.submissionAttachments),
      SubmissionNote:        item.submissionNote,
      Rating:                item.rating,
      ClosedBy:              item.closedBy,
      Revision:              item.revision,
      Lastmodified:          new Date().toISOString(),
    };
  }

  /** All activities for a given student (by reg number). */
  async findByAssignee(regNumber: string): Promise<StudentActivityModel[]> {
    return this.findWhere(
      (r) => String(r.assignee ?? '').toLowerCase() === regNumber.toLowerCase(),
    );
  }

  /** All activities created by a staff member. */
  async findByAssignor(email: string): Promise<StudentActivityModel[]> {
    return this.findWhere(
      (r) => String(r.assignor ?? '').toLowerCase() === email.toLowerCase(),
    );
  }

  /** Activities assigned to a reviewer. */
  async findByReviewer(email: string): Promise<StudentActivityModel[]> {
    return this.findWhere(
      (r) => String(r.reviewer ?? '').toLowerCase() === email.toLowerCase(),
    );
  }

  /** All activities for a given course. */
  async findByCourse(course: string): Promise<StudentActivityModel[]> {
    return this.findWhere(
      (r) => String(r.course ?? '').toLowerCase() === course.toLowerCase(),
    );
  }

  /** All activities with a specific status. */
  async findByStatus(status: string): Promise<StudentActivityModel[]> {
    return this.findWhere(
      (r) => String(r.status ?? '').toLowerCase() === status.toLowerCase(),
    );
  }

  /** Combined filter: course + student. */
  async findByCourseAndStudent(
    course: string,
    regNumber: string,
  ): Promise<StudentActivityModel[]> {
    return this.findWhere(
      (r) =>
        String(r.course   ?? '').toLowerCase() === course.toLowerCase() &&
        String(r.assignee ?? '').toLowerCase() === regNumber.toLowerCase(),
    );
  }

  /** Overdue activities (not yet closed). */
  async findOverdue(): Promise<StudentActivityModel[]> {
    return this.findWhere((r) => !!r.isOverdue && r.status !== 'closed');
  }

  async search(query: string): Promise<StudentActivityModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((r) =>
      [r.title, r.assignee, r.assignor, r.course, r.category, r.activityType, r.status]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const studentActivityRepository = new StudentActivityRepository();
