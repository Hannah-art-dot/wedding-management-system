import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { AttendanceStatus, RsvpStatus, TicketStatus } from "@/lib/enums";
import { type SimpleGuestInput } from "@/lib/simple-guest";
import { nowInstant } from "@/lib/time";

export async function nextTicketNumber(): Promise<string> {
  // Include soft-deleted rows — ticket_ticketNumber_key is still unique for them.
  const tickets = await db.orm.public.Ticket.select("ticketNumber").all();

  let max = 0;
  for (const t of tickets) {
    const match = /^T-(\d+)$/i.exec(t.ticketNumber.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `T-${String(max + 1).padStart(5, "0")}`;
}

export async function registerSimpleGuest(input: SimpleGuestInput) {
  const ticketNumber = await nextTicketNumber();
  const existing = await db.orm.public.Ticket.where({ ticketNumber }).first();
  if (existing) {
    throw new Error(`Ticket number "${ticketNumber}" already exists. Retry.`);
  }

  return db.transaction(async (tx) => {
    const now = nowInstant();
    const phone = input.phone?.trim() || null;
    const familyName = (input.familyName?.trim() || input.fullName).trim();

    const family = await tx.orm.public.Family.create({
      id: randomUUID(),
      familyName,
      side: input.side,
      contactPerson: input.fullName.trim(),
      phone,
      notes: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const guest = await tx.orm.public.Guest.create({
      id: randomUUID(),
      familyId: family.id,
      fullName: input.fullName.trim(),
      gender: null,
      phone,
      email: null,
      category: input.category,
      cardStatus: input.cardStatus,
      familyStatus: input.familyStatus,
      side: input.side,
      rsvpStatus: RsvpStatus.PENDING,
      rsvpReceivedAt: null,
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
