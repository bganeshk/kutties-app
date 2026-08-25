// Shared audit fields mixed into every model
export interface AuditFields {
  lastmodified?: string;
}

export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
