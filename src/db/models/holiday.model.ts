// ── Domain model (what the UI works with) ────────────────────────────────
// Matches the HolidayList sheet columns:
//   id | Description | Date | Tuition | KG | Daycare | Teachers
//
// The flag columns (Tuition, KG, Daycare, Teachers) accept heterogeneous
// values in the Excel sheet: "Yes", "Y", TRUE (boolean), or absent/empty.
// We normalise them to:
//   tuition  / kg / daycare  → boolean  (true = holiday applies)
//   teachers                 → 'yes' | 'opt' | 'no'  (mandatory / optional / not applicable)

export type TeachersHoliday = 'yes' | 'opt' | 'no';

export interface HolidayModel {
  id:          string;
  description: string;
  date:        string;       // ISO date string  YYYY-MM-DD
  tuition:     boolean;
  kg:          boolean;
  daycare:     boolean;
  teachers:    TeachersHoliday;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function toBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val ?? '').trim().toLowerCase();
  return s === 'yes' || s === 'y' || s === 'true' || s === '1';
}

function toTeachersFlag(val: unknown): TeachersHoliday {
  const s = String(val ?? '').trim().toLowerCase();
  if (s === 'yes' || s === 'y' || s === 'true') return 'yes';
  if (s === 'opt') return 'opt';
  return 'no';
}

// ── Mapper — handles both raw API key (PascalCase) and local DB key ───────
export function toHolidayModel(row: Record<string, unknown>): HolidayModel {
  return {
    id:          String(row.id ?? ''),
    description: String((row.Description ?? row.description) ?? ''),
    date:        String((row.Date ?? row.date) ?? ''),
    tuition:     toBoolean(row.Tuition ?? row.tuition),
    kg:          toBoolean(row.KG ?? row.kg),
    daycare:     toBoolean(row.Daycare ?? row.daycare),
    teachers:    toTeachersFlag(row.Teachers ?? row.teachers),
  };
}
