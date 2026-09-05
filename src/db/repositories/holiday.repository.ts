import { BaseRepository } from './base.repository';
import { HolidayModel, toHolidayModel } from '../models/holiday.model';
import { SHEETS } from '../../utils/constants';

export class HolidayRepository extends BaseRepository<HolidayModel> {
  constructor() {
    super(SHEETS.HOLIDAY_LIST);
  }

  protected fromRow(row: Record<string, unknown>): HolidayModel {
    return toHolidayModel(row);
  }

  protected toRow(item: HolidayModel): Record<string, unknown> {
    return {
      Description: item.description,
      Date:        item.date,
      Tuition:     item.tuition ? 'Yes' : '',
      KG:          item.kg      ? 'Yes' : '',
      Daycare:     item.daycare  ? 'Yes' : '',
      Teachers:    item.teachers === 'yes' ? 'Y' : item.teachers === 'opt' ? 'Opt' : '',
    };
  }

  async search(query: string): Promise<HolidayModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((h) =>
      h.description.toLowerCase().includes(q) ||
      h.date.includes(q),
    );
  }
}

// Singleton instance
export const holidayRepository = new HolidayRepository();
