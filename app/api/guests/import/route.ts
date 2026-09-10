import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  AttendanceStatus,
  RsvpStatus,
  Side,
  TicketStatus,
  type Gender,
} from "@/lib/enums";
import { nowInstant, toInstant } from "@/lib/time";

// ============================================================================
// POST /api/guests/import
//
// Bulk-imports guest/family records (e.g. from an Excel export).
// Each record is one family unit: family, primary guest, optional spouse,
// optional family members, and optional ticket (Ticket table is SOT for numbers).
// Invalid rows are skipped; valid rows commit atomically.
// ============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const rsvpEnum = z.nativeEnum(RsvpStatus).default(RsvpStatus.PENDING);
const attendanceEnum = z.nativeEnum(AttendanceStatus).default(AttendanceStatus.NOT_ARRIVED);
const sideEnum = z.nativeEnum(Side).default(Side.NEUTRAL);
const genderEnum = z
  .enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"] as const)
  .optional();

const phoneRegex = /^[0-9+\-\s()]{6,30}$/;

const guestSchema = z.object({
  fullName: z.string().trim().min(1, "Guest fullName is required"),
  gender: genderEnum,
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Invalid phone format")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  category: z.string().trim().max(50).optional(),
  side: sideEnum,
  rsvpStatus: rsvpEnum,
  attendanceStatus: attendanceEnum,
});

const spouseSchema = z.object({
  name: z.string().trim().min(1, "Spouse name is required"),
  gender: genderEnum,
  rsvpStatus: rsvpEnum,
  attendanceStatus: attendanceEnum,
});

const familyMemberSchema = z.object({
  name: z.string().trim().min(1, "Family member name is required"),
  relationship: z.string().trim().min(1, "Family member relationship is required"),
  age: z.coerce.number().int().min(0).max(130).optional(),
  rsvpStatus: rsvpEnum,
  attendanceStatus: attendanceEnum,
});

const ticketSchema = z.object({
  ticketNumber: z.string().trim().min(1, "Ticket number is required"),
  numberAllowed: z.coerce.number().int().min(1).default(1),
  status: z.nativeEnum(TicketStatus).default(TicketStatus.NOT_ISSUED),
  issueDate: z.coerce.date().optional(),
  usedDate: z.coerce.date().optional(),
  assignTo: z.enum(["family", "guest"]).default("guest"),
});

const importRecordSchema = z.object({
  familyName: z.string().trim().min(1, "familyName is required"),
  side: sideEnum,
  contactPerson: z.string().trim().max(150).optional(),
  familyPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Invalid family phone format")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  notes: z.string().trim().optional(),
  guest: guestSchema,
  spouse: spouseSchema.optional(),
  familyMembers: z.array(familyMemberSchema).optional().default([]),
  ticket: ticketSchema.optional(),
});

const importPayloadSchema = z.object({
  records: z.array(importRecordSchema).min(1, "records array must contain at least one entry"),
  importedByUserId: z.string().optional(),
});

type ImportRecord = z.infer<typeof importRecordSchema>;

interface RowError {
  rowIndex: number;
  familyName?: string;
  reason: string;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = importPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Payload failed schema validation.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { records, importedByUserId } = parsed.data;
  const errors: RowError[] = [];
  const validRecords: { record: ImportRecord; rowIndex: number }[] = [];

  const ticketNumberOccurrences = new Map<string, number[]>();
  records.forEach((record, rowIndex) => {
    const t = record.ticket?.ticketNumber;
    if (!t) return;
    const list = ticketNumberOccurrences.get(t) ?? [];
    list.push(rowIndex);
    ticketNumberOccurrences.set(t, list);
  });

  const duplicateTicketNumbersInPayload = new Set(
    [...ticketNumberOccurrences.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([t]) => t),
  );

  const allTicketNumbers = [...ticketNumberOccurrences.keys()];
  const existingTickets =
    allTicketNumbers.length > 0
      ? await db.orm.public.Ticket.where((t) => t.ticketNumber.in(allTicketNumbers))
          .select("ticketNumber")
          .all()
      : [];

  const existingTicketNumbers = new Set(
    existingTickets.map((t: { ticketNumber: string }) => t.ticketNumber),
  );

  records.forEach((record, rowIndex) => {
    const t = record.ticket?.ticketNumber;
    if (t && duplicateTicketNumbersInPayload.has(t)) {
      errors.push({
        rowIndex,
        familyName: record.familyName,
        reason: `Duplicate ticket number "${t}" appears in multiple rows of this import.`,
      });
      return;
    }
    if (t && existingTicketNumbers.has(t)) {
      errors.push({
        rowIndex,
        familyName: record.familyName,
        reason: `Ticket number "${t}" already exists in the database.`,
      });
      return;
    }
    if (record.ticket?.usedDate && record.ticket.status !== TicketStatus.USED) {
      errors.push({
        rowIndex,
        familyName: record.familyName,
        reason: `Ticket has a usedDate but status is not "USED".`,
      });
      return;
    }
    validRecords.push({ record, rowIndex });
  });

  if (validRecords.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No valid rows to import.",
        stats: { totalRows: records.length, imported: 0, failed: errors.length },
        errors,
      },
      { status: 422 },
    );
  }

  const stats = {
    familiesCreated: 0,
    guestsCreated: 0,
    spousesCreated: 0,
    familyMembersCreated: 0,
    ticketsCreated: 0,
  };

  try {
    await db.transaction(async (tx) => {
      for (const { record } of validRecords) {
        const family = await tx.orm.public.Family.create({
          id: randomUUID(),
          familyName: record.familyName,
          side: record.side,
          contactPerson: record.contactPerson ?? null,
          phone: record.familyPhone ?? null,
          notes: record.notes ?? null,
          deletedAt: null,
          createdAt: nowInstant(),
          updatedAt: nowInstant(),
        });
        stats.familiesCreated += 1;

        const guest = await tx.orm.public.Guest.create({
          id: randomUUID(),
          familyId: family.id,
          fullName: record.guest.fullName,
          gender: (record.guest.gender as Gender | undefined) ?? null,
          phone: record.guest.phone ?? null,
          email: record.guest.email ?? null,
          category: record.guest.category ?? null,
          side: record.guest.side,
          rsvpStatus: record.guest.rsvpStatus,
          rsvpReceivedAt: null,
          attendanceStatus: record.guest.attendanceStatus,
          checkedInAt: null,
          checkedInByUserId: null,
          specialNotes: null,
          deletedAt: null,
          createdAt: nowInstant(),
          updatedAt: nowInstant(),
        });
        stats.guestsCreated += 1;

        if (record.spouse) {
          await tx.orm.public.Spouse.create({
            id: randomUUID(),
            guestId: guest.id,
            name: record.spouse.name,
            gender: (record.spouse.gender as Gender | undefined) ?? null,
            rsvpStatus: record.spouse.rsvpStatus,
            rsvpReceivedAt: null,
            attendanceStatus: record.spouse.attendanceStatus,
            checkedInAt: null,
            checkedInByUserId: null,
            deletedAt: null,
            createdAt: nowInstant(),
            updatedAt: nowInstant(),
          });
          stats.spousesCreated += 1;
        }

        for (const m of record.familyMembers) {
          await tx.orm.public.FamilyMember.create({
            id: randomUUID(),
            familyId: family.id,
            name: m.name,
            relationship: m.relationship,
            age: m.age ?? null,
            rsvpStatus: m.rsvpStatus,
            rsvpReceivedAt: null,
            attendanceStatus: m.attendanceStatus,
            checkedInAt: null,
            checkedInByUserId: null,
            deletedAt: null,
            createdAt: nowInstant(),
            updatedAt: nowInstant(),
          });
          stats.familyMembersCreated += 1;
        }

        if (record.ticket) {
          const assignToFamily = record.ticket.assignTo === "family";
          await tx.orm.public.Ticket.create({
            id: randomUUID(),
            ticketNumber: record.ticket.ticketNumber,
            numberAllowed: record.ticket.numberAllowed,
            numberUsed: 0,
            status: record.ticket.status,
            issueDate: record.ticket.issueDate
              ? toInstant(record.ticket.issueDate)
              : null,
            usedDate: record.ticket.usedDate
              ? toInstant(record.ticket.usedDate)
              : null,
            familyId: assignToFamily ? family.id : null,
            guestId: assignToFamily ? null : guest.id,
            deletedAt: null,
            createdAt: nowInstant(),
            updatedAt: nowInstant(),
          });
          stats.ticketsCreated += 1;
        }
      }

      if (importedByUserId) {
        await tx.orm.public.AuditLog.create({
          id: randomUUID(),
          userId: importedByUserId,
          action: "BULK_IMPORT",
          recordType: "Guest",
          recordId: null,
          metadata: JSON.stringify({
            totalRows: records.length,
            imported: validRecords.length,
            failed: errors.length,
            ...stats,
          }),
          timestamp: nowInstant(),
        });
      }
    });
  } catch (err) {
    console.error("Guest import transaction failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(message)) {
      return NextResponse.json(
        {
          success: false,
          error: "Import aborted: a unique constraint was violated during the transaction.",
          detail: message,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Import transaction failed and was fully rolled back. No rows were written.",
      },
      { status: 500 },
    );
  }

  const status = errors.length > 0 ? 207 : 200;

  return NextResponse.json(
    {
      success: true,
      message:
        errors.length > 0
          ? `Imported ${validRecords.length} of ${records.length} rows. ${errors.length} row(s) were skipped — see "errors".`
          : `Successfully imported all ${validRecords.length} rows.`,
      stats: {
        totalRows: records.length,
        imported: validRecords.length,
        failed: errors.length,
        ...stats,
      },
      errors,
    },
    { status },
  );
}
