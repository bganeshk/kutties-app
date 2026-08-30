import { MONTHS } from '../../utils/constants';

/**
 * Converts any common date format to dd/MMM/yyyy (e.g. 15/Jan/2010).
 * Handles: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, and already-normalised dd/MMM/yyyy.
 * Returns undefined for empty/null input, original string if format is unrecognised.
 */
export function normaliseDate(raw: unknown): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  // Already dd/MMM/yyyy
  if (/^\d{1,2}\/[A-Za-z]{3}\/\d{4}$/.test(s)) return s;
  // ISO datetime with timestamp: YYYY-MM-DDTHH:mm... — strip time first
  const stripped = s.replace(/T.*$/, '');
  // YYYY-MM-DD (or stripped from ISO datetime)
  const iso = stripped.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!isNaN(d.getTime()))
      return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
  }
  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    if (!isNaN(d.getTime()))
      return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
  }
  return s; // return as-is if unrecognised
}

/**
 * Extracts HH:MM from any time-like value.
 * Handles:
 *  - ISO datetime strings (Excel epoch): "1899-12-30T09:45:00.000Z" → "09:45"
 *  - Plain time strings: "9:45" → "09:45", "09:45" → "09:45"
 * Returns undefined for empty/null input.
 */
export function extractTime(raw: unknown): string | undefined {
  if (!raw) return undefined;
  const s = String(raw);
  // ISO datetime — grab HH:MM after the T
  const isoMatch = s.match(/T(\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1];
  // Plain time like "9:45" or "09:45"
  const plainMatch = s.match(/^(\d{1,2}:\d{2})/);
  if (plainMatch) return plainMatch[1].padStart(5, '0');
  return undefined;
}

/**
 * Normalises a timestamp value that carries both a date and a time.
 * Preserves the time component as "HH:MM:SS AM/PM".
 *
 * Handles:
 *  - ISO datetime: "2024-08-15T09:45:30.000Z" → "09:45:30 AM"
 *  - Excel epoch:  "1899-12-30T09:45:00.000Z" → "09:45:00 AM"
 *  - Already formatted: "09:45:30 AM" → "09:45:30 AM"
 *  - Plain HH:MM:SS:  "09:45:30" → "09:45:30 AM"
 *  - Plain HH:MM:SS AM/PM: "9:45:30 PM" → "9:45:30 PM" (pass-through)
 *
 * Falls back to normaliseDate if no time component is found.
 */
export function normaliseDateTime(raw: unknown): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;

  // Already in "H:MM:SS AM/PM" or "HH:MM AM/PM" format
  if (/^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)$/i.test(s)) return s;

  // ISO datetime — extract time from after the T, convert to 12-hour
  const isoMatch = s.match(/T(\d{2}):(\d{2}):(\d{2})/);
  if (isoMatch) {
    const h = parseInt(isoMatch[1], 10);
    const m = isoMatch[2];
    const sec = isoMatch[3];
    const suffix = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m}:${sec} ${suffix}`;
  }

  // Plain HH:MM:SS
  const plainMatch = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (plainMatch) {
    const h = parseInt(plainMatch[1], 10);
    const m = plainMatch[2];
    const sec = plainMatch[3];
    const suffix = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m}:${sec} ${suffix}`;
  }

  // Plain HH:MM (no seconds)
  const shortMatch = s.match(/^(\d{1,2}):(\d{2})$/);
  if (shortMatch) {
    const h = parseInt(shortMatch[1], 10);
    const m = shortMatch[2];
    const suffix = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${suffix}`;
  }

  return s;
}
