// ── Excel sheet: student_Observation_Qn ──────────────────────────────────────
// Columns: id, Question, Category, SortOrder, Active
// Read-only reference data — never written back to Excel from the app.

export interface StudentObservationQnModel {
  id: string;
  question?: string;   // Excel: Question
  category?: string;   // Excel: Category
  sortOrder?: number;  // Excel: SortOrder
  active?: boolean;    // Excel: Active
  course?: string;     // Excel: course — 'all' = applies to every course; otherwise matches student's course exactly
}

// ── Mapper ────────────────────────────────────────────────────────────────────
export function toStudentObservationQnModel(
  row: Record<string, unknown>,
): StudentObservationQnModel {
  const rawActive = row.Active ?? row.active;
  return {
    id:        String(row.id ?? row.Id ?? ''),
    question:  (row.Question  ?? row.question)  as string | undefined,
    category:  (row.Category  ?? row.category)  as string | undefined,
    sortOrder: row.SortOrder != null ? Number(row.SortOrder) : (row.sortOrder != null ? Number(row.sortOrder) : undefined),
    active:    rawActive === true || rawActive === 'true' || rawActive === 1 || rawActive === '1',
    course:    (row.course ?? row.Course) as string | undefined,
  };
}
