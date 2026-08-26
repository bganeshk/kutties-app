import { BaseRepository } from './base.repository';
import { TeacherModel, toTeacherModel, parseSubjects } from '../models/teacher.model';

export class TeacherRepository extends BaseRepository<TeacherModel> {
  constructor() {
    super('teachers');
  }

  protected fromRow(row: Record<string, unknown>): TeacherModel {
    return toTeacherModel(row);
  }

  protected toRow(item: TeacherModel): Record<string, unknown> {
    return {
      name:         item.name,
      designation:  item.designation,
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

  async search(query: string): Promise<TeacherModel[]> {
    const q = query.toLowerCase();
    return this.findWhere(t =>
      [t.name, t.email, t.phone, t.designation, t.subjects]
        .some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }
}

// Singleton instance
export const teacherRepository = new TeacherRepository();
