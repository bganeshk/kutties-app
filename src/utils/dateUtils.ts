import { MONTHS } from './constants';

// ── Display format: dd-mm-yyyy ─────────────────────────────────────────────────

/**
 * Converts any stored date to display format dd-mm-yyyy.
 * Handles:
 *   dd/MMM/yyyy  (internal storage, e.g. "15/Jan/2024") → "15-01-2024"
 *   YYYY-MM-DD   (ISO, e.g. "2024-01-15")               → "15-01-2024"
 *   DD/MM/YYYY   (e.g. "15/01/2024")                    → "15-01-2024"
 *   DD-MM-YYYY   (already display format)               → "15-01-2024"
 * Returns the original string unchanged for any unrecognised format.
 */
export function formatDisplayDate(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;

  // dd/MMM/yyyy — internal storage format
  const dmy = s.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dmy) {
    const month = MONTHS.findIndex(m => m.toLowerCase() === dmy[2].toLowerCase()) + 1;
    if (month > 0)
      return `${dmy[1].padStart(2, '0')}-${String(month).padStart(2, '0')}-${dmy[3]}`;
  }

  // YYYY-MM-DD — ISO format
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;

  // DD/MM/YYYY or DD-MM-YYYY (numeric)
  const numeric = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (numeric)
    return `${numeric[1].padStart(2, '0')}-${numeric[2].padStart(2, '0')}-${numeric[3]}`;

  return s; // unrecognised — pass through
}

// ── ISO format: YYYY-MM-DD (used by Teacher & Employee forms) ─────────────────

/** Parse a 'YYYY-MM-DD' string; returns null on invalid input. */
export function parseISODate(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date to 'YYYY-MM-DD'. */
export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Auto-mask a raw text input into YYYY-MM-DD, inserting dashes at positions 4 and 7. */
export function applyISODateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

// ── DMY format: dd/MMM/yyyy (used by Student form & DB storage) ───────────────

/** Parse a 'dd/MMM/yyyy' string (e.g. 15/Jan/2010); returns null on invalid input. */
export function parseDMYDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (!m) return null;
  const month = MONTHS.findIndex(mo => mo.toLowerCase() === m[2].toLowerCase());
  if (month === -1) return null;
  const d = new Date(Number(m[3]), month, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date to 'dd/MMM/yyyy'. */
export function formatDMYDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
}

/**
 * Auto-mask a raw text input into dd/MMM/yyyy.
 * Allows digits, letters (for month abbreviation), and slashes.
 */
export function applyDMYDateMask(raw: string): string {
  const cleaned = raw.replace(/[^0-9a-zA-Z/]/g, '');
  const bare = cleaned.replace(/\//g, '');
  if (bare.length <= 2) return bare;
  const day = bare.slice(0, 2);
  const rest = bare.slice(2);
  if (rest.length <= 3) return `${day}/${rest}`;
  const mon = rest.slice(0, 3);
  const yr  = rest.slice(3, 7);
  return `${day}/${mon}/${yr}`;
}
