import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  AttendanceStatus,
  CardStatus,
  RsvpStatus,
  TicketStatus,
  countsTowardDinner,
  type CardStatus as CardStatusType,
  type Side as SideType,
} from "@/lib/enums";
import { nowInstant } from "@/lib/time";

const SEARCH_LIMIT = 25;
const MIN_QUERY_LENGTH = 2;

export type CheckInSearchResult = {
  guestId: string;
  fullName: string;
  phone: string | null;
  familyName: string | null;
  side: SideType;
  cardStatus: CardStatusType;
  rsvpStatus: RsvpStatus;
  attendanceStatus: string;
  ticketNumber: string | null;
  /** SRS §23 Allowed */
  numberAllowed: number;
  /** SRS §23 Expected (CONFIRMED dinner covers for the party) */
  numberExpected: number;
  /** SRS §23 Checked In (ticket seats used) */
  numberUsed: number;
  alreadyCheckedIn: boolean;
};

export type CheckInResult =
  | {
      ok: true;
      status: "checked_in" | "undone";
      message: string;
      guest: CheckInSearchResult;
    }
  | {
      ok: false;
      status: "already_checked_in" | "not_found" | "ticket_blocked" | "error";
      message: string;
      guest?: CheckInSearchResult;
    };

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function patternFor(query: string): string {
  return `%${escapeIlike(query.trim())}%`;
}

type TicketRow = {
  id: string;
  ticketNumber: string;
  numberAllowed: number;
  numberUsed: number;
  status: string;
  familyId: string | null;
  guestId: string | null;
  deletedAt: Temporal.Instant | null;
};

type FamilyRow = {
  id: string;
  familyName: string;
  side: SideType;
  deletedAt: Temporal.Instant | null;
  tickets?: TicketRow[];
};

type GuestRow = {
  id: string;
  fullName: string;
  phone: string | null;
  side: SideType;
  cardStatus: CardStatusType;
  rsvpStatus: RsvpStatus;
  attendanceStatus: string;
  familyId: string | null;
  deletedAt: Temporal.Instant | null;
  family?: FamilyRow | null;
  ticket?: TicketRow | null;
};

function pickTicket(guest: GuestRow, familyTickets: TicketRow[]): TicketRow | null {
  if (guest.ticket && guest.ticket.deletedAt == null) return guest.ticket;
  const familyTicket = familyTickets.find(
    (t) => t.familyId === guest.familyId && t.deletedAt == null,
  );
  return familyTicket ?? null;
}

function toSearchResult(
  guest: GuestRow,
  familyTickets: TicketRow[],
  numberExpected: number,
): CheckInSearchResult {
  const ticket = pickTicket(guest, familyTickets);
  return {
    guestId: guest.id,
    fullName: guest.fullName,
    phone: guest.phone,
    familyName: guest.family?.familyName ?? null,
    side: guest.side,
    cardStatus: guest.cardStatus ?? CardStatus.WITH_CARD,
    rsvpStatus: guest.rsvpStatus,
    attendanceStatus: guest.attendanceStatus,
    ticketNumber: ticket?.ticketNumber ?? null,
    numberAllowed: ticket?.numberAllowed ?? 1,
    numberExpected,
    numberUsed: ticket?.numberUsed ?? 0,
    alreadyCheckedIn: guest.attendanceStatus === AttendanceStatus.ARRIVED,
  };
}

/** Confirmed dinner covers for a guest's party (SRS Expected). */
async function expectedForGuest(guest: GuestRow): Promise<number> {
  if (guest.familyId) {
    const [familyGuests, members] = await Promise.all([
      db.orm.public.Guest.where({ familyId: guest.familyId })
        .where((g) => g.deletedAt.isNull())
        .where({ rsvpStatus: RsvpStatus.CONFIRMED })
        .select("id")
        .all(),
      db.orm.public.FamilyMember.where({ familyId: guest.familyId })
        .where((m) => m.deletedAt.isNull())
        .where({ rsvpStatus: RsvpStatus.CONFIRMED })
        .select("id")
        .all(),
    ]);
    const guestIds = familyGuests.map((g) => g.id);
    let spouses = 0;
    if (guestIds.length > 0) {
      const spouseRows = await db.orm.public.Spouse.where((s) => s.guestId.in(guestIds))
        .where((s) => s.deletedAt.isNull())
        .where({ rsvpStatus: RsvpStatus.CONFIRMED })
        .select("id")
        .all();
      spouses = spouseRows.length;
    }
    return familyGuests.length + members.length + spouses;
  }

  let total = countsTowardDinner(guest.rsvpStatus) ? 1 : 0;
  const spouse = await db.orm.public.Spouse.where({ guestId: guest.id })
    .where((s) => s.deletedAt.isNull())
    .first();
  if (spouse && countsTowardDinner(spouse.rsvpStatus as RsvpStatus)) total += 1;
  return total;
}

async function loadGuestsByIds(ids: string[]): Promise<GuestRow[]> {
  if (ids.length === 0) return [];
  return (await db.orm.public.Guest.where((g) => g.id.in(ids))
    .where((g) => g.deletedAt.isNull())
    .include("family", (family) =>
      family
        .select("id", "familyName", "side", "deletedAt")
        .include("tickets", (tickets) =>
          tickets
            .where((t) => t.deletedAt.isNull())
            .select(
              "id",
              "ticketNumber",
              "numberAllowed",
              "numberUsed",
              "status",
              "familyId",
              "guestId",
              "deletedAt",
            ),
        ),
    )
    .include("ticket", (ticket) =>
      ticket.select(
        "id",
        "ticketNumber",
        "numberAllowed",
        "numberUsed",
        "status",
        "familyId",
        "guestId",
        "deletedAt",
      ),
    )
    .orderBy((g) => g.fullName.asc())
    .limit(SEARCH_LIMIT)
    .all()) as GuestRow[];
}

/**
 * Search guests by full name or phone only (case-insensitive).
 * Multi-word name queries require every token to appear in fullName
 * (e.g. "Woyinshet Lema" matches that guest, not the whole family).
 */
export async function searchForCheckIn(rawQuery: string): Promise<CheckInSearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < MIN_QUERY_LENGTH) return [];

  const tokens = query.split(/\s+/).filter(Boolean);
  const leadPattern = patternFor(tokens[0] ?? query);
  const phonePattern = patternFor(query);

  const [byNameLead, byPhone] = await Promise.all([
    db.orm.public.Guest.where((g) => g.fullName.ilike(leadPattern))
      .where((g) => g.deletedAt.isNull())
      .select("id", "fullName", "phone")
      .limit(SEARCH_LIMIT * 4)
      .all(),
    db.orm.public.Guest.where((g) => g.phone.ilike(phonePattern))
      .where((g) => g.deletedAt.isNull())
      .select("id", "fullName", "phone")
      .limit(SEARCH_LIMIT)
      .all(),
  ]);

  const queryLower = query.toLowerCase();
  const queryDigits = query.replace(/\D/g, "");

  const idSet = new Set<string>();

  for (const row of byNameLead) {
    const nameLower = row.fullName.toLowerCase();
    const allTokensMatch = tokens.every((t) => nameLower.includes(t.toLowerCase()));
    if (allTokensMatch) idSet.add(row.id);
  }

  for (const row of byPhone) {
    const phone = row.phone?.trim() ?? "";
    if (!phone) continue;
    const phoneLower = phone.toLowerCase();
    const phoneDigits = phone.replace(/\D/g, "");
    if (
      phoneLower.includes(queryLower) ||
      (queryDigits.length >= 2 && phoneDigits.includes(queryDigits))
    ) {
      idSet.add(row.id);
    }
  }

  const guests = await loadGuestsByIds([...idSet].slice(0, SEARCH_LIMIT));
  const familyTickets = guests.flatMap((g) => g.family?.tickets ?? []);
  const visible = guests.filter((g) => g.family == null || g.family.deletedAt == null);

  // Keep only guests whose name/phone match (no family/ticket bleed-through).
  const filtered = visible.filter((g) => {
    const nameLower = g.fullName.toLowerCase();
    if (tokens.every((t) => nameLower.includes(t.toLowerCase()))) return true;
    const phone = g.phone?.trim() ?? "";
    if (!phone) return false;
    const phoneLower = phone.toLowerCase();
    const phoneDigits = phone.replace(/\D/g, "");
    return (
      phoneLower.includes(queryLower) ||
      (queryDigits.length >= 2 && phoneDigits.includes(queryDigits))
    );
  });

  const expectedCounts = await Promise.all(filtered.map((g) => expectedForGuest(g)));
  return filtered.map((g, i) => toSearchResult(g, familyTickets, expectedCounts[i] ?? 0));
}

/**
 * Toggle check-in: mark ARRIVED (With/Without Card), or undo if already arrived.
 * Increments/decrements linked ticket numberUsed when capacity allows.
 */
export async function checkInGuest(
  guestId: string,
  options?: { checkedInByUserId?: string; cardStatus?: CardStatusType },
): Promise<CheckInResult> {
  const cardStatus = options?.cardStatus ?? CardStatus.WITH_CARD;

  return db.transaction(async (tx) => {
    const guest = (await tx.orm.public.Guest.where({ id: guestId })
      .where((g) => g.deletedAt.isNull())
      .include("family", (family) =>
        family
          .select("id", "familyName", "side", "deletedAt")
          .include("tickets", (tickets) =>
            tickets
              .where((t) => t.deletedAt.isNull())
              .select(
                "id",
                "ticketNumber",
                "numberAllowed",
                "numberUsed",
                "status",
                "familyId",
                "guestId",
                "deletedAt",
              ),
          ),
      )
      .include("ticket", (ticket) =>
        ticket.select(
          "id",
          "ticketNumber",
          "numberAllowed",
          "numberUsed",
          "status",
          "familyId",
          "guestId",
          "deletedAt",
        ),
      )
      .first()) as GuestRow | null;

    if (!guest) {
      return {
        ok: false,
        status: "not_found",
        message: "Guest not found or has been removed.",
      };
    }

    const familyTickets = guest.family?.tickets ?? [];
    const numberExpected = await expectedForGuest(guest);
    const ticket = pickTicket(guest, familyTickets);

    // Already checked in → undo / uncheck.
    if (guest.attendanceStatus === AttendanceStatus.ARRIVED) {
      const undoneAt = nowInstant();

      await tx.orm.public.Guest.where({ id: guest.id }).update({
        attendanceStatus: AttendanceStatus.NOT_ARRIVED,
        checkedInAt: null,
        checkedInByUserId: null,
        updatedAt: undoneAt,
      });

      guest.attendanceStatus = AttendanceStatus.NOT_ARRIVED;

      if (ticket && ticket.numberUsed > 0) {
        const numberUsed = ticket.numberUsed - 1;
        const status =
          numberUsed <= 0
            ? TicketStatus.ISSUED
            : numberUsed >= ticket.numberAllowed
              ? TicketStatus.USED
              : TicketStatus.PARTIAL;

        await tx.orm.public.Ticket.where({ id: ticket.id }).update({
          numberUsed,
          status,
          usedDate: null,
          updatedAt: undoneAt,
        });

        ticket.numberUsed = numberUsed;
        ticket.status = status;
      }

      await tx.orm.public.AuditLog.create({
        id: randomUUID(),
        userId: options?.checkedInByUserId ?? null,
        action: "CHECK_OUT",
        recordType: "Guest",
        recordId: guest.id,
        metadata: JSON.stringify({
          fullName: guest.fullName,
          ticketNumber: ticket?.ticketNumber ?? null,
          numberUsed: ticket?.numberUsed ?? null,
          numberAllowed: ticket?.numberAllowed ?? null,
        }),
        timestamp: undoneAt,
      });

      return {
        ok: true,
        status: "undone",
        message: `${guest.fullName} check-in undone.`,
        guest: toSearchResult(guest, familyTickets, numberExpected),
      };
    }

    if (
      ticket &&
      (ticket.status === TicketStatus.CANCELLED || ticket.status === TicketStatus.LOST)
    ) {
      return {
        ok: false,
        status: "ticket_blocked",
        message: `Ticket ${ticket.ticketNumber} is ${ticket.status.toLowerCase()} and cannot be used for check-in.`,
        guest: toSearchResult(guest, familyTickets, numberExpected),
      };
    }

    if (ticket && ticket.numberUsed >= ticket.numberAllowed) {
      return {
        ok: false,
        status: "ticket_blocked",
        message: `Ticket ${ticket.ticketNumber} is at full capacity (${ticket.numberUsed}/${ticket.numberAllowed}).`,
        guest: toSearchResult(guest, familyTickets, numberExpected),
      };
    }

    const checkedInAt = nowInstant();

    await tx.orm.public.Guest.where({ id: guest.id }).update({
      attendanceStatus: AttendanceStatus.ARRIVED,
      cardStatus,
      checkedInAt,
      checkedInByUserId: options?.checkedInByUserId ?? null,
      updatedAt: checkedInAt,
    });

    guest.attendanceStatus = AttendanceStatus.ARRIVED;
    guest.cardStatus = cardStatus;

    if (ticket) {
      const numberUsed = ticket.numberUsed + 1;
      const status =
        numberUsed >= ticket.numberAllowed
          ? TicketStatus.USED
          : numberUsed > 0
            ? TicketStatus.PARTIAL
            : (ticket.status as typeof TicketStatus.ISSUED);

      await tx.orm.public.Ticket.where({ id: ticket.id }).update({
        numberUsed,
        status,
        ...(numberUsed >= ticket.numberAllowed ? { usedDate: checkedInAt } : {}),
        updatedAt: checkedInAt,
      });

      ticket.numberUsed = numberUsed;
      ticket.status = status;
    }

    await tx.orm.public.AuditLog.create({
      id: randomUUID(),
      userId: options?.checkedInByUserId ?? null,
      action: "CHECK_IN",
      recordType: "Guest",
      recordId: guest.id,
      metadata: JSON.stringify({
        fullName: guest.fullName,
        cardStatus,
        ticketNumber: ticket?.ticketNumber ?? null,
        numberUsed: ticket?.numberUsed ?? null,
        numberAllowed: ticket?.numberAllowed ?? null,
      }),
      timestamp: checkedInAt,
    });

    return {
      ok: true,
      status: "checked_in",
      message: `${guest.fullName} checked in (${cardStatus}).`,
      guest: toSearchResult(guest, familyTickets, numberExpected),
    };
  });
}

export type CardCheckInInput = {
  guestId: string;
  cardStatus: CardStatusType;
  checkedInByUserId?: string;
};

/** Check in a guest and record With Card / Without Card. */
export async function checkInWithCardStatus(
  input: CardCheckInInput,
): Promise<CheckInResult> {
  return checkInGuest(input.guestId, {
    checkedInByUserId: input.checkedInByUserId,
    cardStatus: input.cardStatus,
  });
}
