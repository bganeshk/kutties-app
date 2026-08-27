const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
