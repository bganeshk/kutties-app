import { LocalDb } from '../../sync/sync.service';

export class BaseRepository<T extends { id: string }> {
  constructor(protected readonly sheet: string) {}

  async findAll(): Promise<T[]> {
    const rows = await LocalDb.getRows(this.sheet);
    return rows.map(r => this.fromRow(r));
  }

  async findById(id: string): Promise<T | null> {
    const row = await LocalDb.getRow(this.sheet, id);
    return row ? this.fromRow(row) : null;
  }

  async findWhere(predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.findAll();
    return all.filter(predicate);
  }

  async save(item: T): Promise<void> {
    const existing = await LocalDb.getRow(this.sheet, item.id);
    const row = this.toRow(item);
    if (existing) {
      await LocalDb.updateRow(this.sheet, item.id, row);
    } else {
      await LocalDb.insertRow(this.sheet, item.id, row);
    }
  }

  async delete(id: string): Promise<void> {
    await LocalDb.deleteRow(id);
  }

  async count(): Promise<number> {
    return (await LocalDb.getRows(this.sheet)).length;
  }

  protected fromRow(row: Record<string, unknown>): T {
    return row as unknown as T;
  }

  protected toRow(item: T): Record<string, unknown> {
    return item as unknown as Record<string, unknown>;
  }
}
