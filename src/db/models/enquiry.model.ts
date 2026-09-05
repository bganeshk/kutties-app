// ── Domain model (what the UI works with) ────────────────────────────────
// Matches the enquiries sheet columns:
//   id | Enq: Date | ClassDivision | Student Name | EmailId | Address
//   WhatsApp | WhatsAppSend | Admission Taken | mailed | Revision | Lastmodified

export interface EnquiryModel {
  id:               string;
  enqDate:          string;   // ISO date string YYYY-MM-DD
  classDivision:    string;
  studentName:      string;
  emailId:          string;
  address:          string;
  whatsApp:         string;
  whatsAppSend:     boolean;
  admissionTaken:   boolean;
  mailed:           boolean;
  revision:         string | number | null;
  lastmodified:     string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function toBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val ?? '').trim().toLowerCase();
  return s === 'yes' || s === 'y' || s === 'true' || s === '1';
}

// ── Mapper — handles both raw API key (PascalCase) and local DB key ───────
export function toEnquiryModel(row: Record<string, unknown>): EnquiryModel {
  return {
    id:             String(row.id ?? ''),
    enqDate:        String((row['Enq: Date'] ?? row.enqDate) ?? ''),
    classDivision:  String((row.ClassDivision ?? row.classDivision) ?? ''),
    studentName:    String((row['Student Name'] ?? row.studentName) ?? ''),
    emailId:        String((row.EmailId ?? row.emailId) ?? ''),
    address:        String((row.Address ?? row.address) ?? ''),
    whatsApp:       String((row.WhatsApp ?? row.whatsApp) ?? ''),
    whatsAppSend:   toBoolean(row.WhatsAppSend ?? row.whatsAppSend),
    admissionTaken: toBoolean(row['Admission Taken'] ?? row.admissionTaken),
    mailed:         toBoolean(row.mailed),
    revision:       (row.Revision ?? row.revision ?? null) as string | number | null,
    lastmodified:   String((row.Lastmodified ?? row.lastmodified) ?? ''),
  };
}
