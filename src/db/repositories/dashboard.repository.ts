import { BaseRepository } from './base.repository';
import { DashboardModel, toDashboardModel } from '../models/dashboard.model';

export class DashboardRepository extends BaseRepository<DashboardModel> {
  constructor() {
    super('dashboard');
  }

  protected fromRow(row: Record<string, unknown>): DashboardModel {
    return toDashboardModel(row);
  }

  async findByParentview(parentview: string): Promise<DashboardModel[]> {
    return this.findWhere(
      r => String(r.parentview ?? '').trim() === parentview
    );
  }

  async findTopLevel(): Promise<DashboardModel[]> {
    return this.findByParentview('Home');
  }

  async findChildren(caption: string): Promise<DashboardModel[]> {
    return this.findByParentview(caption);
  }

  async hasChildren(caption: string): Promise<boolean> {
    const children = await this.findChildren(caption);
    return children.length > 0;
  }
}

export const dashboardRepository = new DashboardRepository();
