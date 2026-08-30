import { BaseRepository } from './base.repository';
import { HandbookModel, toHandbookModel } from '../models/handbook.model';
import { SHEETS } from '../../utils/constants';

export class HandbookRepository extends BaseRepository<HandbookModel> {
  constructor() {
    // Sheet name matches the Excel tab exactly (capital H) — see SHEETS.HANDBOOK
    super(SHEETS.HANDBOOK);
  }

  protected fromRow(row: Record<string, unknown>): HandbookModel {
    return toHandbookModel(row);
  }

  protected toRow(item: HandbookModel): Record<string, unknown> {
    return {
      Remarks: item.remarks,
    };
  }

  async search(query: string): Promise<HandbookModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((h) =>
      String(h.remarks ?? '').toLowerCase().includes(q),
    );
  }
}

// Singleton instance
export const handbookRepository = new HandbookRepository();
