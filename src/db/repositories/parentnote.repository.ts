import { BaseRepository } from './base.repository';
import { ParentNoteModel, toParentNoteModel } from '../models/parentnote.model';
import { SHEETS } from '../../utils/constants';

export class ParentNoteRepository extends BaseRepository<ParentNoteModel> {
  constructor() {
    super(SHEETS.PARENT_NOTE);
  }

  protected fromRow(row: Record<string, unknown>): ParentNoteModel {
    return toParentNoteModel(row);
  }

  protected toRow(item: ParentNoteModel): Record<string, unknown> {
    return {
      Student:         item.regNumber,
      NoteDate:        item.noteDate,
      NoteText:        item.noteText,
      Category:        item.category,
      ParentName:      item.parentName,
      Status:          item.status ?? 'pending',
      AcknowledgedBy:  item.acknowledgedBy,
      AcknowledgedAt:  item.acknowledgedAt,
      TeacherReply:    item.teacherReply,
      revision:        item.revision,
      lastmodified:    new Date().toISOString(),
    };
  }

  /** All notes for a specific student reg number */
  async findByStudent(regNumber: string): Promise<ParentNoteModel[]> {
    return this.findWhere((r) =>
      String(r.regNumber ?? '').toLowerCase() === regNumber.toLowerCase(),
    );
  }

  /** Notes that are still pending acknowledgement */
  async findPending(): Promise<ParentNoteModel[]> {
    return this.findWhere((r) => (r.status ?? 'pending') === 'pending');
  }
}

export const parentNoteRepository = new ParentNoteRepository();
