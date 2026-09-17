import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { GuestRegistrationInput, FamilyCreateInput, FamilyMemberInput } from "@/lib/guest-schemas";
import {
  AttendanceStatus,
  RsvpStatus,
  TicketStatus,
  countsTowardDinner,
  type Gender,
  type RsvpStatus as RsvpStatusType,
  type Side,
} from "@/lib/enums";
import { nowInstant, toInstant } from "@/lib/time";

export type FamilySummary = {
  id: string;
  familyName: string;
  side: Side;
  contactPerson: string | null;
  phone: string | null;
  notes: string | null;
  guestCount: number;
  invited: number;
  confirmed: number;
  notAttending: number;
  pending: number;
};

function emptyToNull(value: string | undefined | null): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t.length ? t : null;
}

export async function listFamilies(): Promise<FamilySummary[]> {
  const families = await db.orm.public.Family.where((f) => f.deletedAt.isNull())
    .orderBy((f) => f.familyName.asc())
    .all();

  const summaries: FamilySummary[] = [];

  const familyIds = families.map((f) => f.id);
  
  const allGuests = familyIds.length > 0 
    ? await db.orm.public.Guest.where((g) => g.familyId.in(familyIds)).where((g) => g.deletedAt.isNull()).all()
    : [];
  const allMembers = familyIds.length > 0 
    ? await db.orm.public.FamilyMember.where((m) => m.familyId.in(familyIds)).where((m) => m.deletedAt.isNull()).all()
    : [];
  const guestIds = allGuests.map((g) => g.id);
  const allSpouses = guestIds.length > 0
    ? await db.orm.public.Spouse.where((s) => s.guestId.in(guestIds)).where((s) => s.deletedAt.isNull()).all()
    : [];
  const allTickets = familyIds.length > 0
    ? await db.orm.public.Ticket.where((t) => t.familyId.in(familyIds)).where((t) => t.deletedAt.isNull()).all()
    : [];
  const allGuestTickets = guestIds.length > 0
    ? await db.orm.public.Ticket.where((t) => t.guestId.in(guestIds)).where((t) => t.deletedAt.isNull()).all()
    : [];

  for (const family of families) {
    const guests = allGuests.filter(g => g.familyId === family.id);
    const members = allMembers.filter(m => m.familyId === family.id);
    
    const familyGuestIds = new Set(guests.map((g) => g.id));
    const spouses = allSpouses.filter(s => familyGuestIds.has(s.guestId));

    const party = [
      ...guests.map((g) => g.rsvpStatus),
      ...spouses.map((s) => s.rsvpStatus),
      ...members.map((m) => m.rsvpStatus),
    ];

    const tickets = allTickets.filter(t => t.familyId === family.id);
    const guestTickets = allGuestTickets.filter(t => t.guestId && familyGuestIds.has(t.guestId));
    
    const invitedFromTickets = [...tickets, ...guestTickets].reduce(
      (sum, t) => sum + (t.numberAllowed ?? 0),
      0,
    );

    summaries.push({
      id: family.id,
      familyName: family.familyName,
      side: family.side as Side,
      contactPerson: family.contactPerson,
      phone: family.phone,
      notes: family.notes,
      guestCount: guests.length,
      invited: invitedFromTickets > 0 ? invitedFromTickets : party.length,
      confirmed: party.filter((r) => countsTowardDinner(r as RsvpStatusType)).length,
      notAttending: party.filter((r) => r === RsvpStatus.DECLINED).length,
      pending: party.filter(
        (r) => r === RsvpStatus.PENDING || r === RsvpStatus.MAYBE,
      ).length,
    });
  }

  return summaries;
}

export async function createFamily(input: FamilyCreateInput) {
  const now = nowInstant();
  return db.orm.public.Family.create({
    id: randomUUID(),
    familyName: input.familyName.trim(),
    side: input.side,
    contactPerson: emptyToNull(input.contactPerson),
    phone: emptyToNull(input.phone),
    notes: emptyToNull(input.notes),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function addFamilyMembers(familyId: string, members: FamilyMemberInput[]) {
  const now = nowInstant();
  const created = [];
  for (const m of members) {
    const row = await db.orm.public.FamilyMember.create({
      id: randomUUID(),
      familyId,
      name: m.name.trim(),
      relationship: m.relationship.trim(),
      age: m.age ?? null,
      rsvpStatus: m.rsvpStatus,
      rsvpReceivedAt: m.rsvpStatus !== RsvpStatus.PENDING ? now : null,
      attendanceStatus: m.attendanceStatus,
      checkedInAt: null,
      checkedInByUserId: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    created.push(row);
  }
  return created;
}

export async function registerGuest(input: GuestRegistrationInput) {
  return db.transaction(async (tx) => {
    const now = nowInstant();
    let familyId: string | null = null;

    if (input.familyMode === "existing" && input.familyId) {
      const existing = await tx.orm.public.Family.where({ id: input.familyId })
        .where((f) => f.deletedAt.isNull())
        .first();
      if (!existing) {
        throw new Error("Selected family was not found.");
      }
      familyId = existing.id;
    } else if (input.familyMode === "new" && input.family) {
      const family = await tx.orm.public.Family.create({
        id: randomUUID(),
        familyName: input.family.familyName.trim(),
        side: input.family.side ?? input.side,
        contactPerson:
          emptyToNull(input.family.contactPerson) ?? emptyToNull(input.fullName),
        phone: emptyToNull(input.family.phone) ?? emptyToNull(input.phone),
        notes: emptyToNull(input.family.notes),
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      familyId = family.id;
    }

    const guest = await tx.orm.public.Guest.create({
      id: randomUUID(),
      familyId,
      fullName: input.fullName.trim(),
      gender: (input.gender as Gender | undefined) ?? null,
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email),
      category: emptyToNull(input.category),
      cardStatus: null,
      side: input.side,
      rsvpStatus: input.rsvpStatus,
      rsvpReceivedAt: input.rsvpStatus !== RsvpStatus.PENDING ? now : null,
      numberAttending: input.numberAttending ?? null,
      attendanceStatus: input.attendanceStatus ?? AttendanceStatus.NOT_ARRIVED,
      checkedInAt: null,
      checkedInByUserId: null,
      specialNotes: emptyToNull(input.specialNotes),
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    let spouseId: string | null = null;
    if (input.spouse?.include && input.spouse.name?.trim()) {
      const spouse = await tx.orm.public.Spouse.create({
        id: randomUUID(),
        guestId: guest.id,
        name: input.spouse.name.trim(),
        gender: (input.spouse.gender as Gender | undefined) ?? null,
        rsvpStatus: input.spouse.rsvpStatus,
        rsvpReceivedAt: input.spouse.rsvpStatus !== RsvpStatus.PENDING ? now : null,
        ticketStatus: input.spouse.ticketStatus ?? TicketStatus.NOT_ISSUED,
        attendanceStatus: input.spouse.attendanceStatus ?? AttendanceStatus.NOT_ARRIVED,
        checkedInAt: null,
        checkedInByUserId: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      spouseId = spouse.id;
    }

    const memberIds: string[] = [];
    if (familyId && input.familyMembers.length > 0) {
      for (const m of input.familyMembers) {
        const row = await tx.orm.public.FamilyMember.create({
          id: randomUUID(),
          familyId,
          name: m.name.trim(),
          relationship: m.relationship.trim(),
          age: m.age ?? null,
          rsvpStatus: m.rsvpStatus,
          rsvpReceivedAt: m.rsvpStatus !== RsvpStatus.PENDING ? now : null,
          attendanceStatus: m.attendanceStatus,
          checkedInAt: null,
          checkedInByUserId: null,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        });
        memberIds.push(row.id);
      }
    }

    let ticketId: string | null = null;
    if (input.ticket?.include && input.ticket.ticketNumber?.trim()) {
      const assignToFamily = input.ticket.assignTo === "family" && familyId;
      const existing = await tx.orm.public.Ticket.where({
        ticketNumber: input.ticket.ticketNumber.trim(),
      }).first();
      if (existing) {
        throw new Error(`Ticket number "${input.ticket.ticketNumber}" already exists.`);
      }

      let issueDate: Temporal.Instant | null = null;
      if (input.ticket.issueDate) {
        const d = new Date(input.ticket.issueDate);
        if (!Number.isNaN(d.getTime())) issueDate = toInstant(d);
      } else if (
        input.ticket.status === TicketStatus.ISSUED ||
        input.ticket.status === TicketStatus.UNUSED
      ) {
        issueDate = now;
      }

      const ticket = await tx.orm.public.Ticket.create({
        id: randomUUID(),
        ticketNumber: input.ticket.ticketNumber.trim(),
        numberAllowed: input.ticket.numberAllowed,
        numberUsed: 0,
        status: input.ticket.status,
        issueDate,
        usedDate: null,
        familyId: assignToFamily ? familyId : null,
        guestId: assignToFamily ? null : guest.id,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      ticketId = ticket.id;
    }

    await tx.orm.public.AuditLog.create({
      id: randomUUID(),
      userId: null,
      action: "GUEST_REGISTER",
      recordType: "Guest",
      recordId: guest.id,
      metadata: JSON.stringify({
        familyId,
        spouseId,
        memberIds,
        ticketId,
      }),
      timestamp: now,
    });

    return {
      guestId: guest.id,
      familyId,
      spouseId,
      memberIds,
      ticketId,
    };
  });
}

export async function getFamilyDetail(familyId: string) {
  const family = await db.orm.public.Family.where({ id: familyId })
    .where((f) => f.deletedAt.isNull())
    .first();
  if (!family) return null;

  const guests = await db.orm.public.Guest.where({ familyId })
    .where((g) => g.deletedAt.isNull())
    .orderBy((g) => g.fullName.asc())
    .all();
  const members = await db.orm.public.FamilyMember.where({ familyId })
    .where((m) => m.deletedAt.isNull())
    .orderBy((m) => m.name.asc())
    .all();
  const guestIds = guests.map((g) => g.id);
  const spouses =
    guestIds.length > 0
      ? await db.orm.public.Spouse.where((s) => s.guestId.in(guestIds))
          .where((s) => s.deletedAt.isNull())
          .all()
      : [];
  const tickets = await db.orm.public.Ticket.where({ familyId })
    .where((t) => t.deletedAt.isNull())
    .all();
  const guestTickets =
    guestIds.length > 0
      ? await db.orm.public.Ticket.where((t) => t.guestId.in(guestIds))
          .where((t) => t.deletedAt.isNull())
          .all()
      : [];

  return {
    family,
    guests,
    spouses,
    members,
    tickets: [...tickets, ...guestTickets],
  };
}

export async function deleteGuest(id: string, userId: string) {
  const guest = await db.orm.public.Guest.where({ id })
    .where((g) => g.deletedAt.isNull())
    .first();
  if (!guest) throw new Error("Guest not found.");

  const now = nowInstant();
  return db.transaction(async (tx) => {
    await tx.orm.public.Guest.where({ id }).update({ deletedAt: now, updatedAt: now });

    const ticket = await tx.orm.public.Ticket.where({ guestId: id }).where((t) => t.deletedAt.isNull()).first();
    if (ticket) await tx.orm.public.Ticket.where({ id: ticket.id }).update({ deletedAt: now, updatedAt: now });

    const spouse = await tx.orm.public.Spouse.where({ guestId: id }).where((s) => s.deletedAt.isNull()).first();
    if (spouse) await tx.orm.public.Spouse.where({ id: spouse.id }).update({ deletedAt: now, updatedAt: now });

    await tx.orm.public.AuditLog.create({
      id: randomUUID(),
      userId,
      action: "GUEST_DELETE",
      recordType: "Guest",
      recordId: id,
      metadata: JSON.stringify({ fullName: guest.fullName }),
      timestamp: now,
    });
    return guest;
  });
}
