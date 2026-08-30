import { BaseRepository } from './base.repository';
import { TeacherModel, toTeacherModel, parseSubjects } from '../models/teacher.model';
import { SHEETS } from '../../utils/constants';

export class TeacherRepository extends BaseRepository<TeacherModel> {
  constructor() {
    super(SHEETS.STAFF);
  }

  /** Only rows where designation === 'Teacher' belong to teachers. */
  async findAll(): Promise<TeacherModel[]> {
    const all = await super.findAll();
    return all.filter(t => t.designation?.trim().toLowerCase() === 'teacher');
  }

  protected fromRow(row: Record<string, unknown>): TeacherModel {
    return toTeacherModel(row);
  }

  protected toRow(item: TeacherModel): Record<string, unknown> {
    return {
      name:         item.name,
      designation:  item.designation,
      department:   item.department,
      email:        item.email,
      phone:        item.phone,
      address:      item.address,
      status:       item.status,
      subjects:     item.subjects,
      idphoto:      item.idphoto,
      joiningDate:  item.joiningDate,
      remarks:      item.remarks,
      lastmodified: new Date().toISOString(),
    };
  }

  async findActive(): Promise<TeacherModel[]> {
    return this.findWhere(t => t.status === 'active');
  }

  async findInactive(): Promise<TeacherModel[]> {
    return this.findWhere(t => t.status === 'inactive');
  }

  async findBySubject(subject: string): Promise<TeacherModel[]> {
    const q = subject.toLowerCase();
    return this.findWhere(t =>
      parseSubjects(t.subjects).some(s => s.toLowerCase().includes(q))
    );
  }

  /** Returns a map of email → name for all teachers with an email. */
  async emailToNameMap(): Promise<Record<string, string>> {
    const all = await this.findAll();
    const map: Record<string, string> = {};
    for (const t of all) {
      if (t.email) map[t.email.toLowerCase()] = t.name ?? t.email;
    }
    return map;
  }

  async search(query: string): Promise<TeacherModel[]> {
    const q = query.toLowerCase();
    return this.findWhere(t =>
      [t.name, t.email, t.phone, t.designation, t.department, t.subjects]
        .some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }
}

// Singleton instance
export const teacherRepository = new TeacherRepository();
