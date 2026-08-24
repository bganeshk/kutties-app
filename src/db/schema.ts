import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Each sheet in Excel becomes a table here.
// This is the generic "rows" table — stores any sheet's data as JSON.
// For typed sheets, add dedicated tables below.

export const syncedRows = sqliteTable('synced_rows', {
  id: text('id').primaryKey(),          // UUID from Excel API
  sheet: text('sheet').notNull(),       // Excel sheet name
  data: text('data').notNull(),         // JSON-serialised row fields
  updatedAt: integer('updated_at').notNull(),
  syncStatus: text('sync_status', {
    enum: ['synced', 'pending_create', 'pending_update', 'pending_delete'],
  }).notNull().default('synced'),
});

export const syncMeta = sqliteTable('sync_meta', {
  sheet: text('sheet').primaryKey(),
  lastSyncedAt: integer('last_synced_at').notNull().default(0),
});

export type SyncedRow = typeof syncedRows.$inferSelect;
export type SyncMeta  = typeof syncMeta.$inferSelect;
