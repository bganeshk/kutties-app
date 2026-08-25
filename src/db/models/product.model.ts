import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import type { AuditFields } from './audit.model';

export const products = sqliteTable('products', {
  id:           text('id').primaryKey(),
  name:         text('name').notNull(),
  price:        real('price').notNull().default(0),
  stock:        integer('stock').notNull().default(0),
  lastmodified: text('lastmodified'),
  syncStatus:   text('sync_status', {
    enum: ['synced', 'pending_create', 'pending_update', 'pending_delete'],
  }).notNull().default('synced'),
  updatedAt:    integer('updated_at').notNull().default(0),
});

export type Product    = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export interface ProductModel extends AuditFields {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export function toProductModel(row: Record<string, unknown>): ProductModel {
  return {
    id:           String(row.id ?? ''),
    name:         String(row.name ?? ''),
    price:        Number(row.price ?? 0),
    stock:        Number(row.stock ?? 0),
    lastmodified: row.lastmodified as string,
  };
}
