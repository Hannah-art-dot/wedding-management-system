import {
  AttendanceStatus,
  RSVP_LABELS,
  SIDE_LABELS,
  type RsvpStatus,
  type Side,
} from "@/lib/enums";
import type { FamilyReportRow, GuestReportRow } from "@/services/analytics";

export type { FamilyReportRow, GuestReportRow };

/** Empty / missing cell value shared by UI table and CSV (exact mirror). */
export const REPORT_EMPTY = "—";

/** Ticket.numberAllowed when present, else Guest.numberAttending from DB. */
function resolveReportNumberAllowed(r: GuestReportRow): string {
  const candidates = [r.numberAllowed, r.numberAttending];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
      return String(Math.floor(value));
    }
  }
  return REPORT_EMPTY;
}

/**
 * Single source of truth for the Complete Guest List report.
 * UI table headers/cells and CSV headers/cells MUST come from this only.
 */
export const GUEST_REPORT_COLUMNS = [
  {
    header: "Full Name",
    value: (r: GuestReportRow) => r.fullName || REPORT_EMPTY,
  },
  {
    header: "Phone",
    value: (r: GuestReportRow) => r.phone?.trim() || REPORT_EMPTY,
  },
  {
    header: "Family Name",
    value: (r: GuestReportRow) => r.familyName?.trim() || REPORT_EMPTY,
  },
  {
    header: "Side",
    value: (r: GuestReportRow) => r.side || REPORT_EMPTY,
  },
  {
    header: "Category",
    value: (r: GuestReportRow) => r.category?.trim() || REPORT_EMPTY,
  },
  {
    header: "Card Status",
    value: (r: GuestReportRow) => {
      const status = r.cardStatus?.trim();
      return status ? status : REPORT_EMPTY;
    },
  },
  {
    header: "NumberAllowed",
    value: (r: GuestReportRow) => resolveReportNumberAllowed(r),
  },
  {
    header: "Checked In",
    value: (r: GuestReportRow) =>
      r.attendanceStatus === AttendanceStatus.ARRIVED ? "Yes" : "No",
  },
] as const;

export type GuestReportColumn = (typeof GUEST_REPORT_COLUMNS)[number];

export const GUEST_REPORT_HEADERS = GUEST_REPORT_COLUMNS.map((c) => c.header);

/** Canonical row values in column order — identical for UI cells and CSV fields. */
export function guestReportCellValues(row: GuestReportRow): string[] {
  return GUEST_REPORT_COLUMNS.map((col) => col.value(row));
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV built from the same column map + row order as the on-screen table. */
export function guestRowsToCsv(rows: GuestReportRow[]): string {
  const header = GUEST_REPORT_HEADERS.join(",");
  const lines = rows.map((row) =>
    guestReportCellValues(row).map(csvEscape).join(","),
  );
  // UTF-8 BOM helps Excel open accented names correctly.
  return `\uFEFF${[header, ...lines].join("\n")}`;
}

export async function fetchLiveGuestReportRows(): Promise<GuestReportRow[]> {
  const res = await fetch("/api/reports/guests", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !data.success || !Array.isArray(data.rows)) {
    throw new Error(data.error ?? "Could not load live guest report.");
  }
  return data.rows as GuestReportRow[];
}

export function familyRowsToCsv(rows: FamilyReportRow[]): string {
  const header = [
    "FamilyName",
    "Side",
    "ContactPerson",
    "Phone",
    "Guests",
    "Invited",
    "Coming",
    "NotComing",
    "Pending",
    "ExpectedDinner",
    "Tickets",
  ];
  const lines = rows.map((r) =>
    [
      r.familyName,
      SIDE_LABELS[r.side] ?? r.side,
      r.contactPerson,
      r.phone,
      r.guestCount,
      r.invited,
      r.coming,
      r.notComing,
      r.pending,
      r.expectedDinner,
      r.ticketNumbers.join("; "),
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function dinnerRowsToCsv(
  rows: Array<{
    name: string;
    role: string;
    familyName: string | null;
    side: Side;
    relationship: string | null;
    ticketNumber: string | null;
  }>,
): string {
  const header = ["Name", "Role", "FamilyName", "Side", "Relationship", "TicketNumber"];
  const lines = rows.map((r) =>
    [
      r.name,
      r.role,
      r.familyName,
      SIDE_LABELS[r.side] ?? r.side,
      r.relationship,
      r.ticketNumber,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function ReportShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <header className="print:mb-4 mb-8 space-y-3">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase print:text-black">
          {eyebrow}
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight print:text-3xl">
          {title}
        </h1>
        <p className="max-w-2xl text-muted-foreground text-pretty print:text-black">{description}</p>
        <div className="flex flex-wrap items-center gap-3">
          {actions}
          <p className="hidden text-xs text-muted-foreground print:block">
            Our Wedding · Generated {new Date().toLocaleString("en-US")}
          </p>
        </div>
      </header>
      <div className="report-print-surface overflow-x-auto rounded-xl border border-border/80 bg-card/95 print:rounded-none print:border-0 print:bg-white">
        {children}
      </div>
    </main>
  );
}

export function ReportTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <table className="w-full min-w-[40rem] text-left text-sm">
      <thead>
        <tr className="border-b border-border/70 bg-secondary/30 print:bg-transparent">
          {headers.map((h) => (
            <th
              key={h}
              className="px-3 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase print:text-black"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export { RSVP_LABELS, SIDE_LABELS };
export type { RsvpStatus, Side };
