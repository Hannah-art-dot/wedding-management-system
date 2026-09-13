import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { AttendanceStatus, TicketStatus } from "@/lib/enums";
import {
  toStoredRsvp,
  type SimpleGuestInput,
} from "@/lib/simple-guest";
import { nowInstant } from "@/lib/time";

const CATEGORY_STORAGE: Record<SimpleGuestInput["category"], string> = {
  BRIDES_FAMILY: "BRIDES_FAMILY",
  GROOMS_FAMILY: "GROOMS_FAMILY",
  BRIDES_FRIENDS: "BRIDES_FRIENDS",
  GROOMS_FRIENDS: "GROOMS_FRIENDS",
  OTHER: "OTHER",
};

export async function nextTicketNumber(): Promise<string> {
  const tickets = await db.orm.public.Ticket.where((t) => t.deletedAt.isNull())
    .select("ticketNumber")
    .all();

  let max = 0;
  for (const t of tickets) {
    const match = /^T-(\d+)$/i.exec(t.ticketNumber.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `T-${String(max + 1).padStart(5, "0")}`;
}

export async function registerSimpleGuest(input: SimpleGuestInput) {
  const ticketNumber = input.ticketNumber.trim();
  const existing = await db.orm.public.Ticket.where({ ticketNumber }).first();
  if (existing) {
    throw new Error(`Ticket number "${ticketNumber}" already exists.`);
  }

  return db.transaction(async (tx) => {
    const now = nowInstant();
    const phone = input.phone?.trim() || null;
    const email = input.email?.trim() || null;

    const family = await tx.orm.public.Family.create({
      id: randomUUID(),
      familyName: input.familyName.trim(),
      side: input.side,
      contactPerson: input.fullName.trim(),
      phone,
      notes: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const rsvpStatus = toStoredRsvp(input.rsvpStatus);
    const guest = await tx.orm.public.Guest.create({
      id: randomUUID(),
      familyId: family.id,
      fullName: input.fullName.trim(),
      gender: null,
      phone,
      email,
      category: CATEGORY_STORAGE[input.category],
      side: input.side,
      rsvpStatus,
      rsvpReceivedAt: rsvpStatus !== "PENDING" ? now : null,
      numberAttending: input.numberAllowed,
      attendanceStatus: AttendanceStatus.NOT_ARRIVED,
      checkedInAt: null,
      checkedInByUserId: null,
      specialNotes: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await tx.orm.public.Ticket.create({
      id: randomUUID(),
      ticketNumber,
      numberAllowed: input.numberAllowed,
      numberUsed: 0,
      status: TicketStatus.ISSUED,
      issueDate: now,
      usedDate: null,
      familyId: null,
      guestId: guest.id,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return { guestId: guest.id, familyId: family.id, ticketNumber };
  });
}
