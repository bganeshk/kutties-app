import { getDb, DbRow } from '../db/database';
import { ExcelApi } from '../api/excel.api';
import { v4 as uuidv4 } from 'uuid';
import { normalizeRow, toExcelRow } from '../db/models/registry';

// ── Sheet header definitions ──────────────────────────────────────────────────
// These are sent to the API via POST /api/:sheet/init on first launch.
// Column names must exactly match the Excel headers the backend uses.
const SHEET_HEADERS: Record<string, string[]> = {
  StudentMarkSheet: [
    'id', 'Student', 'ExamName', 'ExamDate', 'Subject', 'SubjTeacher',
    'MaxMarks', 'MarksObtained', 'Grade', 'Remarks', 'RecordedBy',
    'Revision', 'Lastmodified',
  ],
};

export type SyncResult = {
  sheet: string;
  pulled: number;
  pushed: number;
  errors: string[];
};

async function pullSheet(sheet: string, sinceDate?: Date): Promise<number> {
  const db = getDb();
  const sinceDateISO = sinceDate ? sinceDate.toISOString().slice(0, 10) : undefined;
  const rows = await ExcelApi.listRows(sheet, sinceDateISO);
  console.log(`[pullSheet] sheet="${sheet}" rows from API: ${rows.length}`);
  if (rows.length > 0) console.log(`[pullSheet] first row keys:`, Object.keys(rows[0]));

  const now = Date.now();

  for (const raw of rows) {
    // Normalize through model registry (field mapping, type coercion, lastmodified)
    const normalized = normalizeRow(sheet, raw as Record<string, unknown>);
    const { id, ...rest } = normalized;
    const rowId = String(id ?? '').trim() || uuidv4();
    await db.upsertRow({
      id:         rowId,
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
      const rawPayload: Record<string, unknown> = {
        ...JSON.parse(row.data),
        lastmodified: new Date().toISOString(),
      };
      const payload = toExcelRow(sheet, rawPayload);
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

export async function syncSheet(sheet: string, sinceDate?: Date): Promise<SyncResult> {
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
    pulled = await pullSheet(sheet, sinceDate);
  } catch (e) {
    errors.push(`pull failed: ${(e as Error).message}`);
  }

  return { sheet, pulled, pushed, errors };
}

/** Convenience: sync the last N days only (filters by attendanceDate). */
export function twoWeeksAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Ensure all known sheets exist in the workbook with their correct headers.
 * Idempotent — safe to call on every app launch before sync begins.
 */
export async function ensureSheets(): Promise<void> {
  await Promise.all(
    Object.entries(SHEET_HEADERS).map(([sheet, headers]) =>
      ExcelApi.initSheet(sheet, headers).catch(() => {}), // never block launch
    ),
  );
}

export async function syncAllSheets(): Promise<SyncResult[]> {
  const sheets = await ExcelApi.listSheets();
  return Promise.all(sheets.map((s) => syncSheet(s)));
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
