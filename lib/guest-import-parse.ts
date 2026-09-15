import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { RsvpStatus, Side, TicketStatus } from "@/lib/enums";

export type SpreadsheetRow = Record<string, string>;

export type MappedImportRecord = {
  familyName: string;
  side: Side;
  contactPerson?: string;
  familyPhone?: string;
  notes?: string;
  guest: {
    fullName: string;
    phone?: string;
    email?: string;
    category?: string;
    side: Side;
    rsvpStatus: RsvpStatus;
    attendanceStatus: "NOT_ARRIVED";
    gender?: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
    /** CSV NumberAllowed — stored on Guest.numberAttending */
    numberAllowed: number;
  };
  spouse?: {
    name: string;
    gender?: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
    rsvpStatus: RsvpStatus;
    attendanceStatus: "NOT_ARRIVED";
  };
  familyMembers?: Array<{
    name: string;
    relationship: string;
    age?: number;
    rsvpStatus: RsvpStatus;
    attendanceStatus: "NOT_ARRIVED";
  }>;
  ticket?: {
    ticketNumber: string;
    numberAllowed: number;
    status: TicketStatus;
    assignTo: "guest" | "family";
  };
};

export type ParseRowError = {
  rowIndex: number;
  familyName?: string;
  reason: string;
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  fullname: "fullName",
  full_name: "fullName",
  name: "fullName",
  guest: "fullName",
  guest_name: "fullName",
  phone: "phone",
  phonenumber: "phone",
  phone_number: "phone",
  mobile: "phone",
  email: "email",
  familyname: "familyName",
  family_name: "familyName",
  family: "familyName",
  side: "side",
  bride_groom_side: "side",
  category: "category",
  guest_category: "category",
  ticketnumber: "ticketNumber",
  ticket_number: "ticketNumber",
  ticket: "ticketNumber",
  numberallowed: "numberAllowed",
  number_allowed: "numberAllowed",
  allowed: "numberAllowed",
  seats: "numberAllowed",
  people_allowed: "numberAllowed",
  rsvpstatus: "rsvpStatus",
  rsvp_status: "rsvpStatus",
  rsvp: "rsvpStatus",
  gender: "gender",
  contactperson: "contactPerson",
  contact_person: "contactPerson",
  contact: "contactPerson",
  familyphone: "familyPhone",
  family_phone: "familyPhone",
  notes: "notes",
  specialnotes: "notes",
  special_notes: "notes",
  spousename: "spouseName",
  spouse_name: "spouseName",
  spouse: "spouseName",
  spousegender: "spouseGender",
  spouse_gender: "spouseGender",
  spousersvp: "spouseRsvp",
  spouse_rsvp: "spouseRsvp",
};

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function normalizeSide(raw: string): Side | null {
  const v = raw.trim().toLowerCase();
  if (!v) return Side.NEUTRAL;
  if (["bride", "brides", "bride_side", "bride's side", "brides side", "b"].includes(v)) {
    return Side.BRIDE;
  }
  if (["groom", "grooms", "groom_side", "groom's side", "grooms side", "g"].includes(v)) {
    return Side.GROOM;
  }
  if (["neutral", "other", "n", "both"].includes(v)) return Side.NEUTRAL;
  if (v === "bride" || v === Side.BRIDE.toLowerCase()) return Side.BRIDE;
  if (v === "groom" || v === Side.GROOM.toLowerCase()) return Side.GROOM;
  if (v === Side.NEUTRAL.toLowerCase()) return Side.NEUTRAL;
  // Accept exact enum
  if (raw.trim().toUpperCase() === "BRIDE") return Side.BRIDE;
  if (raw.trim().toUpperCase() === "GROOM") return Side.GROOM;
  if (raw.trim().toUpperCase() === "NEUTRAL") return Side.NEUTRAL;
  return null;
}

function normalizeRsvp(raw: string): RsvpStatus | null {
  const v = raw.trim().toLowerCase();
  if (!v) return RsvpStatus.PENDING;
  if (["coming", "confirmed", "yes", "attending", "c"].includes(v)) return RsvpStatus.CONFIRMED;
  if (["not coming", "not_coming", "declined", "no", "d"].includes(v)) return RsvpStatus.DECLINED;
  if (["pending", "no response", "no_response", "p"].includes(v)) return RsvpStatus.PENDING;
  if (["maybe", "m"].includes(v)) return RsvpStatus.MAYBE;
  const upper = raw.trim().toUpperCase();
  if (upper in RsvpStatus) return upper as RsvpStatus;
  return null;
}

function normalizeGender(
  raw: string,
): "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED" | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (["male", "m", "man"].includes(v)) return "MALE";
  if (["female", "f", "woman"].includes(v)) return "FEMALE";
  if (["other", "o"].includes(v)) return "OTHER";
  if (["unspecified", "u", "unknown"].includes(v)) return "UNSPECIFIED";
  const upper = raw.trim().toUpperCase();
  if (["MALE", "FEMALE", "OTHER", "UNSPECIFIED"].includes(upper)) {
    return upper as "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
  }
  return undefined;
}

function remapRow(raw: Record<string, unknown>): SpreadsheetRow {
  const out: SpreadsheetRow = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeHeader(key);
    const mapped = HEADER_ALIASES[normalized];
    if (!mapped) continue;
    const str = cellToString(value);
    if (str !== "") out[mapped] = str;
  }
  return out;
}

/** Parse CSV or Excel buffer into normalized header→value row objects (1-based sheet rows excluding header). */
export function parseGuestSpreadsheet(
  buffer: Buffer,
  filename: string,
): { rows: SpreadsheetRow[]; parseErrors: ParseRowError[] } {
  const lower = filename.toLowerCase();
  const parseErrors: ParseRowError[] = [];

  if (lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) {
    const delimiter = lower.endsWith(".tsv") ? "\t" : ",";
    try {
      const records = parseCsv(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
        delimiter,
      }) as Record<string, unknown>[];
      return {
        rows: records.map((r) => remapRow(r)),
        parseErrors,
      };
    } catch (err) {
      parseErrors.push({
        rowIndex: 0,
        reason: err instanceof Error ? err.message : "Failed to parse CSV.",
      });
      return { rows: [], parseErrors };
    }
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".xlsm")) {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        parseErrors.push({ rowIndex: 0, reason: "Workbook has no sheets." });
        return { rows: [], parseErrors };
      }
      const sheet = workbook.Sheets[sheetName];
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      });
      return {
        rows: records.map((r) => remapRow(r)),
        parseErrors,
      };
    } catch (err) {
      parseErrors.push({
        rowIndex: 0,
        reason: err instanceof Error ? err.message : "Failed to parse Excel file.",
      });
      return { rows: [], parseErrors };
    }
  }

  parseErrors.push({
    rowIndex: 0,
    reason: "Unsupported file type. Upload a .csv, .xlsx, or .xls file.",
  });
  return { rows: [], parseErrors };
}

/** Map spreadsheet rows to import API records; collect per-row mapping errors. */
export function mapSpreadsheetRowsToImportRecords(rows: SpreadsheetRow[]): {
  records: MappedImportRecord[];
  errors: ParseRowError[];
} {
  const records: MappedImportRecord[] = [];
  const errors: ParseRowError[] = [];

  rows.forEach((row, index) => {
    const rowIndex = index + 2; // header is row 1
    const fullName = row.fullName?.trim() ?? "";
    if (!fullName) {
      errors.push({ rowIndex, reason: "FullName is required." });
      return;
    }

    const familyName = (row.familyName?.trim() || `${fullName} Family`).trim();
    const sideRaw = row.side ?? "";
    const side = normalizeSide(sideRaw);
    if (side == null) {
      errors.push({
        rowIndex,
        familyName,
        reason: `Invalid Side "${sideRaw}". Use Bride, Groom, or Neutral.`,
      });
      return;
    }

    const rsvpRaw = row.rsvpStatus ?? "";
    const rsvpStatus = normalizeRsvp(rsvpRaw);
    if (rsvpStatus == null) {
      errors.push({
        rowIndex,
        familyName,
        reason: `Invalid RSVPStatus "${rsvpRaw}". Use Coming, Not Coming, Pending, or Maybe.`,
      });
      return;
    }

    let numberAllowed = 1;
    if (row.numberAllowed != null && row.numberAllowed !== "") {
      const n = Number(row.numberAllowed);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
        errors.push({
          rowIndex,
          familyName,
          reason: `Invalid NumberAllowed "${row.numberAllowed}".`,
        });
        return;
      }
      numberAllowed = n;
    }

    const record: MappedImportRecord = {
      familyName,
      side,
      contactPerson: row.contactPerson || fullName,
      familyPhone: row.familyPhone || row.phone,
      notes: row.notes,
      guest: {
        fullName,
        phone: row.phone,
        email: row.email,
        category: row.category,
        side,
        rsvpStatus,
        attendanceStatus: "NOT_ARRIVED",
        gender: normalizeGender(row.gender ?? ""),
        numberAllowed,
      },
    };

    if (row.spouseName?.trim()) {
      record.spouse = {
        name: row.spouseName.trim(),
        gender: normalizeGender(row.spouseGender ?? ""),
        rsvpStatus: normalizeRsvp(row.spouseRsvp ?? "") ?? RsvpStatus.PENDING,
        attendanceStatus: "NOT_ARRIVED",
      };
    }

    if (row.ticketNumber?.trim()) {
      record.ticket = {
        ticketNumber: row.ticketNumber.trim(),
        numberAllowed,
        status: TicketStatus.ISSUED,
        assignTo: "guest",
      };
    }

    records.push(record);
  });

  return { records, errors };
}
