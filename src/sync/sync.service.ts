import { getDb, DbRow } from '../db/database';
import { ExcelApi } from '../api/excel.api';
import { v4 as uuidv4 } from 'uuid';
import { normalizeRow } from '../db/models/registry';

export type SyncResult = {
  sheet: string;
  pulled: number;
  pushed: number;
  errors: string[];
};

async function pullSheet(sheet: string): Promise<number> {
  const db = getDb();
  const rows = await ExcelApi.listRows(sheet);
  const now = Date.now();

  for (const raw of rows) {
    // Normalize through model registry (field mapping, type coercion, lastmodified)
    const normalized = normalizeRow(sheet, raw as Record<string, unknown>);
    const { id, ...rest } = normalized;
    await db.upsertRow({
      id:         String(id ?? raw.id ?? ''),
      sheet,
      data:       JSON.stringify(rest),
      updatedAt:  now,
      syncStatus: 'synced',
    });
  }

  await db.upsertMeta(sheet, now);
  return rows.length;
}

async function pushSheet(sheet: string): Promise<{ pushed: number; errors: string[] }> {
  const db = getDb();
  const all = await db.getRows(sheet);
  const dirty = all.filter((r) => r.syncStatus !== 'synced');
  const errors: string[] = [];
  let pushed = 0;

  for (const row of dirty) {
    try {
      const payload: Record<string, unknown> = {
        ...JSON.parse(row.data),
        lastmodified: new Date().toISOString(),
      };
      if (row.syncStatus === 'pending_create') {
        await ExcelApi.createRow(sheet, { ...payload, id: row.id });
      } else if (row.syncStatus === 'pending_update') {
        await ExcelApi.updateRow(sheet, row.id, payload);
      } else if (row.syncStatus === 'pending_delete') {
        await ExcelApi.deleteRow(sheet, row.id);
        await db.deleteRow(row.id);
        pushed++;
        continue;
      }
      await db.updateRowStatus(row.id, 'synced');
      pushed++;
    } catch (e) {
      errors.push(`${row.id}: ${(e as Error).message}`);
    }
  }

  return { pushed, errors };
}

export async function syncSheet(sheet: string): Promise<SyncResult> {
  const errors: string[] = [];
  let pulled = 0;
  let pushed = 0;

  try {
    const r = await pushSheet(sheet);
    pushed = r.pushed;
    errors.push(...r.errors);
  } catch (e) {
    errors.push(`push failed: ${(e as Error).message}`);
  }

  try {
    pulled = await pullSheet(sheet);
  } catch (e) {
    errors.push(`pull failed: ${(e as Error).message}`);
  }

  return { sheet, pulled, pushed, errors };
}

export async function syncAllSheets(): Promise<SyncResult[]> {
  const sheets = await ExcelApi.listSheets();
  return Promise.all(sheets.map(syncSheet));
}

export const LocalDb = {
  async getRows(sheet: string): Promise<Array<{ id: string } & Record<string, unknown>>> {
    const rows = await getDb().getRows(sheet);
    return rows
      .filter((r) => r.syncStatus !== 'pending_delete')
      .map((r) => ({ id: r.id, ...JSON.parse(r.data) }));
  },

  async getRow(sheet: string, id: string): Promise<Record<string, unknown> | null> {
    const rows = await getDb().getRows(sheet);
    const row = rows.find((r) => r.id === id);
    if (!row || row.syncStatus === 'pending_delete') return null;
    return { id: row.id, ...JSON.parse(row.data) };
  },

  async insertRow(sheet: string, id: string, payload: Record<string, unknown>): Promise<void> {
    await getDb().upsertRow({
      id,
      sheet,
      data: JSON.stringify(payload),
      updatedAt: Date.now(),
      syncStatus: 'pending_create',
    });
  },

  async updateRow(sheet: string, id: string, payload: Record<string, unknown>): Promise<void> {
    const db = getDb();
    const rows = await db.getRows(sheet);
    const existing = rows.find((r) => r.id === id);
    const merged = { ...JSON.parse(existing?.data ?? '{}'), ...payload };
    await db.upsertRow({
      id,
      sheet,
      data: JSON.stringify(merged),
      updatedAt: Date.now(),
      syncStatus: existing?.syncStatus === 'pending_create' ? 'pending_create' : 'pending_update',
    });
  },

  async deleteRow(id: string): Promise<void> {
    await getDb().updateRowStatus(id, 'pending_delete');
  },

  async getLastSyncedAt(sheet: string): Promise<number> {
    const meta = await getDb().getMeta(sheet);
    return meta?.lastSyncedAt ?? 0;
  },
};
