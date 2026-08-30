import { BaseRepository } from './base.repository';
import { EmployeeModel, toEmployeeModel } from '../models/employee.model';
import { SHEETS } from '../../utils/constants';

export class EmployeeRepository extends BaseRepository<EmployeeModel> {
  constructor() {
    super(SHEETS.STAFF);
  }

  /** Only rows where designation is NOT 'Teacher' are employees. */
  async findAll(): Promise<EmployeeModel[]> {
    const all = await super.findAll();
    return all.filter(e => e.designation?.trim().toLowerCase() !== 'teacher');
  }

  protected fromRow(row: Record<string, unknown>): EmployeeModel {
    return toEmployeeModel(row);
  }

  protected toRow(item: EmployeeModel): Record<string, unknown> {
    return {
      name:         item.name,
      designation:  item.designation,
      department:   item.department,
      email:        item.email,
      phone:        item.phone,
      address:      item.address,
      status:       item.status,
      idphoto:      item.idphoto,
      joiningDate:  item.joiningDate,
      lastmodified: new Date().toISOString(),
    };
  }

  async findActive(): Promise<EmployeeModel[]> {
    return this.findWhere(e => e.status === 'active');
  }

  async findInactive(): Promise<EmployeeModel[]> {
    return this.findWhere(e => e.status === 'inactive');
  }

  async findByDepartment(department: string): Promise<EmployeeModel[]> {
    const q = department.toLowerCase();
    return this.findWhere(e =>
      String(e.department ?? '').toLowerCase().includes(q)
    );
  }

  /** Returns a map of email → name for all staff (non-teacher) with an email. */
  async emailToNameMap(): Promise<Record<string, string>> {
    const all = await this.findAll();
    const map: Record<string, string> = {};
    for (const e of all) {
      if (e.email) map[e.email.toLowerCase()] = e.name ?? e.email;
    }
    return map;
  }

  async search(query: string): Promise<EmployeeModel[]> {
    const q = query.toLowerCase();
    return this.findWhere(e =>
      [e.name, e.email, e.phone, e.designation, e.department]
        .some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }
}

// Singleton instance
export const employeeRepository = new EmployeeRepository();
