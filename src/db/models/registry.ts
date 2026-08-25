import { toTeacherModel } from './teacher.model';
import { toDashboardModel } from './dashboard.model';
import { toProductModel } from './product.model';

type RowTransformer = (raw: Record<string, unknown>) => Record<string, unknown>;

// Strip computed/non-storable fields before persisting
function stripComputed(obj: Record<string, unknown>): Record<string, unknown> {
  const { subjectList, ...rest } = obj as any;
  return rest;
}

const TRANSFORMERS: Record<string, RowTransformer> = {
  teachers:  (raw) => stripComputed(toTeacherModel(raw)  as unknown as Record<string, unknown>),
  dashboard: (raw) => stripComputed(toDashboardModel(raw) as unknown as Record<string, unknown>),
  products:  (raw) => stripComputed(toProductModel(raw)   as unknown as Record<string, unknown>),
};

/**
 * Normalize a raw Excel row through its model mapper.
 * Falls back to identity if no model is registered for the sheet.
 */
export function normalizeRow(
  sheet: string,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const transform = TRANSFORMERS[sheet];
  return transform ? transform(raw) : raw;
}

/** Register a new sheet → model transformer at runtime */
export function registerModel(sheet: string, transformer: RowTransformer): void {
  TRANSFORMERS[sheet] = transformer;
}
