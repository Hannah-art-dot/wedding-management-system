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
const PREFIX_SEARCH_LIMIT = 500;
const MIN_QUERY_LENGTH = 1;

export type CheckInSearchResult = {
  guestId: string;
  fullName: string;
  phone: string | null;
  familyName: string | null;
  category: string | null;
  familyStatus: string | null;
  side: SideType;
  cardStatus: CardStatusType | null;
  rsvpStatus: RsvpStatus;
  attendanceStatus: string;
  ticketNumber: string | null;
  /** SRS §23 Allowed — Ticket.numberAllowed / Guest.numberAttending */
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
  category: string | null;
  familyStatus: string | null;
  side: SideType;
  cardStatus: CardStatusType | null;
  numberAttending: number | null;
  rsvpStatus: RsvpStatus;
  attendanceStatus: string;
  familyId: string | null;
  deletedAt: Temporal.Instant | null;
  family?: FamilyRow | null;
  ticket?: TicketRow | null;
};

function pickTicket(guest: GuestRow, familyTickets: TicketRow[]): TicketRow | null {
  // Prefer this guest's own ticket (NumberAllowed lives on Ticket).
  if (guest.ticket && guest.ticket.deletedAt == null) return guest.ticket;
  const ownFromList = familyTickets.find(
    (t) => t.guestId === guest.id && t.deletedAt == null,
  );
  if (ownFromList) return ownFromList;
  // Family-assigned tickets (guestId null, familyId set).
  if (guest.familyId) {
    const familyOnly = familyTickets.find(
      (t) =>
        t.familyId === guest.familyId &&
        t.guestId == null &&
        t.deletedAt == null,
    );
    if (familyOnly) return familyOnly;
    return (
      familyTickets.find(
        (t) => t.familyId === guest.familyId && t.deletedAt == null,
      ) ?? null
    );
  }
  return null;
}

/** Exact Number Allowed from DB: Ticket.numberAllowed, else Guest.numberAttending. */
function resolveNumberAllowed(guest: GuestRow, ticket: TicketRow | null): number {
  const candidates = [ticket?.numberAllowed, guest.numberAttending];
  for (const value of candidates) {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n === "number" && Number.isFinite(n) && n >= 1) {
      return Math.floor(n);
    }
  }
  return 1;
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
    category: guest.category?.trim() || null,
    familyStatus: guest.familyStatus ?? null,
    side: guest.side,
    cardStatus: guest.cardStatus ?? null,
    rsvpStatus: guest.rsvpStatus,
    attendanceStatus: guest.attendanceStatus,
    ticketNumber: ticket?.ticketNumber ?? null,
    numberAllowed: resolveNumberAllowed(guest, ticket),
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

  const guests = (await db.orm.public.Guest.where((g) => g.id.in(ids))
    .where((g) => g.deletedAt.isNull())
    .select(
      "id",
      "fullName",
      "phone",
      "category",
      "familyStatus",
      "side",
      "cardStatus",
      "numberAttending",
      "rsvpStatus",
      "attendanceStatus",
      "familyId",
      "deletedAt",
    )
    .include("family", (family) =>
      family.select("id", "familyName", "side", "deletedAt"),
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

  const familyIds = [
    ...new Set(
      guests
        .map((g) => g.familyId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const ticketSelect = [
    "id",
    "ticketNumber",
    "numberAllowed",
    "numberUsed",
    "status",
    "familyId",
    "guestId",
    "deletedAt",
  ] as const;

  const [ticketsByGuest, ticketsByFamily] = await Promise.all([
    db.orm.public.Ticket.where((t) => t.guestId.in(ids))
      .where((t) => t.deletedAt.isNull())
      .select(...ticketSelect)
      .all(),
    familyIds.length > 0
      ? db.orm.public.Ticket.where((t) => t.familyId.in(familyIds))
          .where((t) => t.deletedAt.isNull())
          .select(...ticketSelect)
          .all()
      : Promise.resolve([]),
  ]);

  const ticketByGuestId = new Map<string, TicketRow>();
  for (const t of ticketsByGuest as TicketRow[]) {
    if (t.guestId) ticketByGuestId.set(t.guestId, t);
  }

  const ticketsByFamilyId = new Map<string, TicketRow[]>();
  for (const t of [...(ticketsByGuest as TicketRow[]), ...(ticketsByFamily as TicketRow[])]) {
    if (!t.familyId) continue;
    const list = ticketsByFamilyId.get(t.familyId) ?? [];
    list.push(t);
    ticketsByFamilyId.set(t.familyId, list);
  }

  for (const guest of guests) {
    const own = ticketByGuestId.get(guest.id);
    if (own) guest.ticket = own;
    if (guest.family) {
      guest.family.tickets = ticketsByFamilyId.get(guest.family.id) ?? [];
    }
  }

  return guests;
}

/**
 * Search guests by full name or phone only (case-insensitive).
 * Letter queries use progressive prefix matching so "N" → "Ne" → "Neb"
 * continuously narrows to names that start with the typed text (A→Z).
 * Queries with digits still match phone numbers.
 */
export async function searchForCheckIn(rawQuery: string): Promise<CheckInSearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < MIN_QUERY_LENGTH) return [];

  const tokens = query.split(/\s+/).filter(Boolean);
  const queryLower = query.toLowerCase();
  const queryDigits = query.replace(/\D/g, "");
  /** Progressive name typing: letters / spaces / apostrophes / hyphens only. */
  const isNamePrefixQuery = /^[A-Za-z][A-Za-z\s'\-]*$/.test(query);
  const resultLimit = isNamePrefixQuery ? PREFIX_SEARCH_LIMIT : SEARCH_LIMIT;
  const leadPattern = isNamePrefixQuery
    ? `${escapeIlike(query)}%`
    : patternFor(tokens[0] ?? query);
  const phonePattern = patternFor(query);

  const [byNameLead, familiesLead, byPhone] = await Promise.all([
    db.orm.public.Guest.where((g) => g.fullName.ilike(leadPattern))
      .where((g) => g.deletedAt.isNull())
      .select("id", "fullName", "phone")
      .limit(resultLimit * 4)
      .all(),
    db.orm.public.Family.where((f) => f.familyName.ilike(leadPattern))
      .where((f) => f.deletedAt.isNull())
      .select("id")
      .limit(resultLimit)
      .all(),
    isNamePrefixQuery
      ? Promise.resolve([] as Array<{ id: string; fullName: string; phone: string | null }>)
      : db.orm.public.Guest.where((g) => g.phone.ilike(phonePattern))
          .where((g) => g.deletedAt.isNull())
          .select("id", "fullName", "phone")
          .limit(SEARCH_LIMIT)
          .all(),
  ]);

  let byFamilyGuests: Array<{ id: string; fullName: string; phone: string | null }> = [];
  if (familiesLead.length > 0) {
    byFamilyGuests = await db.orm.public.Guest.where((g) => g.familyId.in(familiesLead.map(f => f.id)))
      .where((g) => g.deletedAt.isNull())
      .select("id", "fullName", "phone")
      .limit(resultLimit * 4)
      .all() as any;
  }

  const idSet = new Set<string>();

  for (const row of byNameLead) {
    const nameLower = row.fullName.toLowerCase();
    if (isNamePrefixQuery) {
      if (nameLower.startsWith(queryLower)) idSet.add(row.id);
      continue;
    }
    if (tokens.every((t) => nameLower.includes(t.toLowerCase()))) idSet.add(row.id);
  }

  for (const row of byFamilyGuests) {
    idSet.add(row.id);
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

  const guests = await loadGuestsByIds([...idSet].slice(0, resultLimit));
  const familyTickets = guests.flatMap((g) => g.family?.tickets ?? []);
  const visible = guests.filter((g) => g.family == null || g.family.deletedAt == null);

  const filtered = visible.filter((g) => {
    const nameLower = g.fullName.toLowerCase();
    const familyNameLower = g.family?.familyName?.toLowerCase() ?? "";
    if (isNamePrefixQuery) return nameLower.startsWith(queryLower) || familyNameLower.startsWith(queryLower);
    if (tokens.every((t) => nameLower.includes(t.toLowerCase()) || familyNameLower.includes(t.toLowerCase()))) return true;
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
  return filtered
    .map((g, i) => toSearchResult(g, familyTickets, expectedCounts[i] ?? 0))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }));
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
      .select(
        "id",
        "fullName",
        "phone",
        "category",
        "familyStatus",
        "side",
        "cardStatus",
        "numberAttending",
        "rsvpStatus",
        "attendanceStatus",
        "familyId",
        "deletedAt",
      )
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
