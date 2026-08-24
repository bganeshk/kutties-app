import { Platform } from 'react-native';
import { syncedRows as syncedRowsSchema, syncMeta as syncMetaSchema } from './schema';

export interface DbRow {
  id: string;
  sheet: string;
  data: string;
  updatedAt: number;
  syncStatus: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
}

export interface DbMeta {
  sheet: string;
  lastSyncedAt: number;
}

// Unified DB interface — same API on native (SQLite) and web (memory)
export interface IDb {
  getRows(sheet: string): Promise<DbRow[]>;
  upsertRow(row: DbRow): Promise<void>;
  updateRowStatus(id: string, status: DbRow['syncStatus']): Promise<void>;
  deleteRow(id: string): Promise<void>;
  getMeta(sheet: string): Promise<DbMeta | null>;
  upsertMeta(sheet: string, ts: number): Promise<void>;
}

// ─── Web: in-memory store ────────────────────────────────────────────────────
class MemoryDb implements IDb {
  private rows = new Map<string, DbRow>();
  private meta = new Map<string, number>();

  async getRows(sheet: string) {
    return [...this.rows.values()].filter((r) => r.sheet === sheet);
  }
  async upsertRow(row: DbRow) { this.rows.set(row.id, row); }
  async updateRowStatus(id: string, status: DbRow['syncStatus']) {
    const r = this.rows.get(id);
    if (r) this.rows.set(id, { ...r, syncStatus: status });
  }
  async deleteRow(id: string) { this.rows.delete(id); }
  async getMeta(sheet: string) {
    const ts = this.meta.get(sheet);
    return ts !== undefined ? { sheet, lastSyncedAt: ts } : null;
  }
  async upsertMeta(sheet: string, ts: number) { this.meta.set(sheet, ts); }
}

// ─── Native: expo-sqlite ─────────────────────────────────────────────────────
class SQLiteDb implements IDb {
  private dbPromise: Promise<import('expo-sqlite').SQLiteDatabase>;

  constructor() {
    // dynamic import so the module is never loaded on web
    this.dbPromise = (async () => {
      const SQLite = await import('expo-sqlite');
      const db = await SQLite.openDatabaseAsync('excel_sync.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS synced_rows (
          id TEXT PRIMARY KEY,
          sheet TEXT NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'synced'
        );
        CREATE INDEX IF NOT EXISTS idx_sheet ON synced_rows(sheet);
        CREATE TABLE IF NOT EXISTS sync_meta (
          sheet TEXT PRIMARY KEY,
          last_synced_at INTEGER NOT NULL DEFAULT 0
        );
      `);
      return db;
    })();
  }

  private async db() { return this.dbPromise; }

  async getRows(sheet: string): Promise<DbRow[]> {
    const db = await this.db();
    const rows = await db.getAllAsync<{
      id: string; sheet: string; data: string; updated_at: number; sync_status: string;
    }>('SELECT * FROM synced_rows WHERE sheet = ?', sheet);
    return rows.map((r) => ({
      id: r.id, sheet: r.sheet, data: r.data,
      updatedAt: r.updated_at,
      syncStatus: r.sync_status as DbRow['syncStatus'],
    }));
  }

  async upsertRow(row: DbRow) {
    const db = await this.db();
    await db.runAsync(
      `INSERT INTO synced_rows (id, sheet, data, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at,
         sync_status = excluded.sync_status`,
      row.id, row.sheet, row.data, row.updatedAt, row.syncStatus,
    );
  }

  async updateRowStatus(id: string, status: DbRow['syncStatus']) {
    const db = await this.db();
    await db.runAsync('UPDATE synced_rows SET sync_status = ? WHERE id = ?', status, id);
  }

  async deleteRow(id: string) {
    const db = await this.db();
    await db.runAsync('DELETE FROM synced_rows WHERE id = ?', id);
  }

  async getMeta(sheet: string): Promise<DbMeta | null> {
    const db = await this.db();
    const row = await db.getFirstAsync<{ sheet: string; last_synced_at: number }>(
      'SELECT * FROM sync_meta WHERE sheet = ?', sheet,
    );
    return row ? { sheet: row.sheet, lastSyncedAt: row.last_synced_at } : null;
  }

  async upsertMeta(sheet: string, ts: number) {
    const db = await this.db();
    await db.runAsync(
      `INSERT INTO sync_meta (sheet, last_synced_at) VALUES (?, ?)
       ON CONFLICT(sheet) DO UPDATE SET last_synced_at = excluded.last_synced_at`,
      sheet, ts,
    );
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────
let _db: IDb | null = null;

export function getDb(): IDb {
  if (!_db) throw new Error('DB not initialised — call initDb() first');
  return _db;
}

export async function initDb(): Promise<void> {
  if (Platform.OS === 'web') {
    _db = new MemoryDb();
  } else {
    const sqlite = new SQLiteDb();
    // trigger table creation eagerly
    await sqlite.getRows('__init__');
    _db = sqlite;
  }
}
