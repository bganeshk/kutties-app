// ── Domain model (what the UI works with) ────────────────────────────────
export interface HandbookModel {
  id: string;
  remarks?: string;
}

// ── Mapper — handles both raw API key (PascalCase) and local DB key ───────
export function toHandbookModel(row: Record<string, unknown>): HandbookModel {
  return {
    id:      String(row.id ?? ''),
    remarks: (row.Remarks ?? row.remarks) as string | undefined,
  };
}
