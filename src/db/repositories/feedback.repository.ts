import { BaseRepository } from './base.repository';
import {
  FeedbackModel,
  toFeedbackModel,
} from '../models/feedback.model';
import { SHEETS } from '../../utils/constants';

export class FeedbackRepository extends BaseRepository<FeedbackModel> {
  constructor() {
    super(SHEETS.FEEDBACK);
  }

  protected fromRow(row: Record<string, unknown>): FeedbackModel {
    return toFeedbackModel(row);
  }

  protected toRow(item: FeedbackModel): Record<string, unknown> {
    return {
      studentName:  item.studentName,
      teacherName:  item.teacherName,
      subject:      item.subject,
      feedbackDate: item.feedbackDate,
      rating:       item.rating,
      category:     item.category,
      feedback:     item.feedback,
      actionTaken:  item.actionTaken,
      status:       item.status,
      remarks:      item.remarks,
      createdBy:    item.createdBy,
      lastmodified: new Date().toISOString(),
    };
  }

  async findByStatus(
    status: FeedbackModel['status'],
  ): Promise<FeedbackModel[]> {
    return this.findWhere((f) => f.status === status);
  }

  async search(query: string): Promise<FeedbackModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((f) =>
      [f.studentName, f.teacherName, f.subject, f.category, f.feedback]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }
}

// Singleton instance
export const feedbackRepository = new FeedbackRepository();
