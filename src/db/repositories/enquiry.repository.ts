import { BaseRepository } from './base.repository';
import { EnquiryModel, toEnquiryModel } from '../models/enquiry.model';
import { SHEETS } from '../../utils/constants';

export class EnquiryRepository extends BaseRepository<EnquiryModel> {
  constructor() {
    super(SHEETS.ENQUIRIES);
  }

  protected fromRow(row: Record<string, unknown>): EnquiryModel {
    return toEnquiryModel(row);
  }

  protected toRow(item: EnquiryModel): Record<string, unknown> {
    return {
      'Enq: Date':       item.enqDate,
      ClassDivision:     item.classDivision,
      'Student Name':    item.studentName,
      EmailId:           item.emailId,
      Address:           item.address,
      WhatsApp:          item.whatsApp,
      WhatsAppSend:      item.whatsAppSend ? 'Yes' : '',
      'Admission Taken': item.admissionTaken ? 'Yes' : '',
      mailed:            item.mailed ? 'Yes' : '',
      Revision:          item.revision,
      Lastmodified:      item.lastmodified,
    };
  }

  async search(query: string): Promise<EnquiryModel[]> {
    const q = query.toLowerCase();
    return this.findWhere((e) =>
      e.studentName.toLowerCase().includes(q) ||
      e.classDivision.toLowerCase().includes(q) ||
      e.emailId.toLowerCase().includes(q) ||
      e.enqDate.includes(q),
    );
  }
}

// Singleton instance
export const enquiryRepository = new EnquiryRepository();
