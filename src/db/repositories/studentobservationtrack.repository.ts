import { BaseRepository } from './base.repository';
import {
  StudentObservationTrackModel,
  toStudentObservationTrackModel,
} from '../models/studentobservationtrack.model';
import { SHEETS } from '../../utils/constants';

export class StudentObservationTrackRepository extends BaseRepository<StudentObservationTrackModel> {
  constructor() {
    super(SHEETS.STUDENT_OBSERVATION_TRACK);
  }

  protected fromRow(row: Record<string, unknown>): StudentObservationTrackModel {
    return toStudentObservationTrackModel(row);
  }

  protected toRow(item: StudentObservationTrackModel): Record<string, unknown> {
    return {
      Student:      item.regNumber,
      ObsDate:      item.obsDate,
      QuestionId:   item.questionId,
      Answer:       item.answer ?? '',
      Remark:       item.remark,
      RecordedBy:   item.recordedBy,
      revision:     (item.revision ?? 0) + 1,
      lastmodified: new Date().toISOString(),
    };
  }

  /** All observation records for a given student reg number */
  async findByStudent(regNumber: string): Promise<StudentObservationTrackModel[]> {
    return this.findWhere((r) =>
      String(r.regNumber ?? '').toLowerCase() === regNumber.toLowerCase(),
    );
  }

  /** All records for a specific student + date (a single session) */
  async findBySession(
    regNumber: string,
    obsDate: string,
  ): Promise<StudentObservationTrackModel[]> {
    return this.findWhere(
      (r) =>
        String(r.regNumber ?? '').toLowerCase() === regNumber.toLowerCase() &&
        (r.obsDate ?? '') === obsDate,
    );
  }

  /** Delete all records belonging to a session (student + date) */
  async deleteSession(regNumber: string, obsDate: string): Promise<void> {
    const records = await this.findBySession(regNumber, obsDate);
    await Promise.all(records.map((r) => this.delete(r.id)));
  }
}

export const studentObservationTrackRepository = new StudentObservationTrackRepository();
