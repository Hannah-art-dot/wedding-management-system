import { RSVP_LABELS, SIDE_LABELS, type RsvpStatus, type Side } from "@/lib/enums";
import type { FamilyReportRow, GuestReportRow } from "@/services/analytics";

export type { FamilyReportRow, GuestReportRow };

export const GUEST_EXPORT_HEADERS = [
  "FullName",
  "FamilyName",
  "Side",
  "Category",
  "RSVPStatus",
  "AttendanceStatus",
  "TicketNumber",
  "NumberAllowed",
  "NumberCheckedIn",
  "Phone",
  "Email",
  "SpouseName",
  "Notes",
] as const;

export type GuestExportRecord = Record<(typeof GUEST_EXPORT_HEADERS)[number], string | number>;

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function guestRowToExportRecord(r: GuestReportRow): GuestExportRecord {
  return {
    FullName: r.fullName,
    FamilyName: r.familyName ?? "",
    Side: r.side,
    Category: r.category ?? "",
    RSVPStatus: r.rsvpStatus === "DECLINED" ? "NOT_COMING" : r.rsvpStatus,
    AttendanceStatus: r.attendanceStatus,
    TicketNumber: r.ticketNumber ?? "",
    NumberAllowed: r.numberAllowed ?? "",
    NumberCheckedIn: r.numberUsed ?? 0,
    Phone: r.phone ?? "",
    Email: r.email ?? "",
    SpouseName: r.spouseName ?? "",
    Notes: r.specialNotes ?? "",
  };
}

export function guestRowsToExportRecords(rows: GuestReportRow[]): GuestExportRecord[] {
  return rows.map(guestRowToExportRecord);
}

export function guestRowsToCsv(rows: GuestReportRow[]): string {
  const records = guestRowsToExportRecords(rows);
  const lines = records.map((r) =>
    GUEST_EXPORT_HEADERS.map((key) => csvEscape(r[key])).join(","),
  );
  return [GUEST_EXPORT_HEADERS.join(","), ...lines].join("\n");
}

export async function guestRowsToXlsBlob(rows: GuestReportRow[]): Promise<Blob> {
  const XLSX = await import("xlsx");
  const records = guestRowsToExportRecords(rows);
  const worksheet = XLSX.utils.json_to_sheet(records, {
    header: [...GUEST_EXPORT_HEADERS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Guests");
  const buffer = XLSX.write(workbook, { bookType: "xls", type: "array" });
  return new Blob([buffer], { type: "application/vnd.ms-excel" });
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
