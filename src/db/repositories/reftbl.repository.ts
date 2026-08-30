import { LocalDb, syncSheet } from '../../sync/sync.service';
import { SHEETS } from '../../utils/constants';

/**
 * reftbl sheet structure (actual):
 *
 *   id | subject_ref        | paymentmethod | leaveref | feeref | …
 *   ---|--------------------|--------------  |---------|---------|-
 *   2  | Action Rhyme       | GPay           | …       | …       |
 *   3  | Art & Craft        | Cash           | …       | …       |
 *   …
 *
 * Each ROW holds one value per reference type.
 * The column name IS the reference type (e.g. "subject_ref", "leaveref").
 * To get all subjects: collect every non-null value of the "subject_ref" column.
 *
 * Usage:
 *   getRefOptions('subject_ref')  →  ['Action Rhyme', 'Art & Craft', …]
 *
 * You can also pass the short name and this function will match
 * any column that contains the word (case-insensitive):
 *   getRefOptions('subject')  →  same result (matches "subject_ref")
 */
export async function getRefOptions(ref: string): Promise<string[]> {
  const rows = await LocalDb.getRows(SHEETS.REFTBL);

  if (rows.length === 0) {
    console.warn('[reftbl] local table empty — calling ensureReftbl() first?');
    return [];
  }

  // Discover the right column: exact match first, then substring match
  const keys = Object.keys(rows[0]);
  const q = ref.toLowerCase();
  const col =
    keys.find((k) => k.toLowerCase() === q) ??              // exact: "subject_ref"
    keys.find((k) => k.toLowerCase().includes(q));          // partial: "subject" → "subject_ref"

  if (!col) {
    console.warn(`[reftbl] No column matching "${ref}". Available:`, keys);
    return [];
  }

  const results = rows
    .map((r) => String(r[col] ?? '').trim())
    .filter(Boolean);

  console.log(`[reftbl] getRefOptions("${ref}") → col="${col}", ${results.length} items`);
  return results;
}

/**
 * Pull the reftbl sheet from the server.
 * Always re-syncs so stale/empty caches are refreshed.
 */
export async function ensureReftbl(): Promise<void> {
  await syncSheet(SHEETS.REFTBL);
}
