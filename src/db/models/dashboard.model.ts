import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import type { AuditFields } from './audit.model';

export const dashboard = sqliteTable('dashboard', {
  id:           text('id').primaryKey(),
  txid:         text('txid'),
  dashcaption:  text('dashcaption'),
  dashImage:    text('dash_image'),
  appviewsheet: text('appviewsheet'),
  parentview:   text('parentview'),
  userrole:     text('userrole'),
  screenOrder:  integer('screen_order'),
  lastmodified: text('lastmodified'),
  syncStatus:   text('sync_status', {
    enum: ['synced', 'pending_create', 'pending_update', 'pending_delete'],
  }).notNull().default('synced'),
});

export type DashboardRow    = typeof dashboard.$inferSelect;
export type NewDashboardRow = typeof dashboard.$inferInsert;

export interface DashboardModel extends AuditFields {
  id: string;
  txid?: string;
  Dashcaption?: string;
  dash_image?: string;
  appviewsheet?: string;
  parentview?: string;
  userrole?: string;
  screen_order?: number;
}

export function toDashboardModel(row: Record<string, unknown>): DashboardModel {
  return {
    id:           String(row.id ?? row.txid ?? ''),
    txid:         row.txid as string,
    Dashcaption:  row.Dashcaption as string,
    dash_image:   row.dash_image as string,
    appviewsheet: row.appviewsheet as string,
    parentview:   row.parentview as string,
    userrole:     row.userrole as string,
    screen_order: row.screen_order as number,
    lastmodified: row.lastmodified as string,
  };
}
