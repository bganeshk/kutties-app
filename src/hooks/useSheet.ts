import { useState, useEffect, useCallback } from 'react';
import { LocalDb, syncSheet, SyncResult } from '../sync/sync.service';
import { v4 as uuidv4 } from 'uuid';

export function useSheet(sheet: string) {
  const [rows, setRows] = useState<Array<{ id: string } & Record<string, unknown>>>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await LocalDb.getRows(sheet);
    setRows(data);
    setLastSync(await LocalDb.getLastSyncedAt(sheet));
  }, [sheet]);

  const sync = useCallback(async (): Promise<SyncResult> => {
    setSyncing(true);
    setError(null);
    try {
      const result = await syncSheet(sheet);
      if (result.errors.length) setError(result.errors.join('\n'));
      await load();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [sheet, load]);

  const insert = useCallback(async (payload: Record<string, unknown>) => {
    const id = uuidv4();
    await LocalDb.insertRow(sheet, id, payload);
    await load();
    return id;
  }, [sheet, load]);

  const update = useCallback(async (id: string, payload: Record<string, unknown>) => {
    await LocalDb.updateRow(sheet, id, payload);
    await load();
  }, [sheet, load]);

  const remove = useCallback(async (id: string) => {
    await LocalDb.deleteRow(id);
    await load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, syncing, lastSync, error, sync, insert, update, remove, reload: load };
}
