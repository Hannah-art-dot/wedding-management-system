import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import { nowInstant } from "@/lib/time";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Soft-delete a guest (admin only). Also soft-deletes linked ticket and spouse. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const guest = await db.orm.public.Guest.where({ id })
      .where((g) => g.deletedAt.isNull())
      .first();

    if (!guest) {
      return NextResponse.json({ success: false, error: "Guest not found." }, { status: 404 });
    }

    const now = nowInstant();

    await db.transaction(async (tx) => {
      await tx.orm.public.Guest.where({ id }).update({
        deletedAt: now,
        updatedAt: now,
      });

      const ticket = await tx.orm.public.Ticket.where({ guestId: id })
        .where((t) => t.deletedAt.isNull())
        .first();
      if (ticket) {
        await tx.orm.public.Ticket.where({ id: ticket.id }).update({
          deletedAt: now,
          updatedAt: now,
        });
      }

      const spouse = await tx.orm.public.Spouse.where({ guestId: id })
        .where((s) => s.deletedAt.isNull())
        .first();
      if (spouse) {
        await tx.orm.public.Spouse.where({ id: spouse.id }).update({
          deletedAt: now,
          updatedAt: now,
        });
      }

      await tx.orm.public.AuditLog.create({
        id: randomUUID(),
        userId: session.id,
        action: "GUEST_DELETE",
        recordType: "Guest",
        recordId: id,
        metadata: JSON.stringify({ fullName: guest.fullName }),
        timestamp: now,
      });
    });

    return NextResponse.json({
      success: true,
      message: `Deleted guest ${guest.fullName}.`,
    });
  } catch (err) {
    console.error("Delete guest failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not delete guest." },
      { status: 500 },
    );
  }
}
