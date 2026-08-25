import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Typed table for the "products" Excel sheet
export const products = sqliteTable('products', {
  id:         text('id').primaryKey(),
  name:       text('name').notNull(),
  price:      real('price').notNull().default(0),
  stock:      integer('stock').notNull().default(0),
  syncStatus: text('sync_status', {
    enum: ['synced', 'pending_create', 'pending_update', 'pending_delete'],
  }).notNull().default('synced'),
  updatedAt:  integer('updated_at').notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// Generic JSON-row table for all other sheets
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
