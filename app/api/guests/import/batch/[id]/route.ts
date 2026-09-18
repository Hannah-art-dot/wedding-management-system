import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { Side } from "@/lib/enums";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const editGuestSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(1, "Full name is required"),
  familyName: z.string().trim().min(1, "Family name is required"),
  side: z.nativeEnum(Side),
  category: z.string().trim().optional(),
  numberAttending: z.coerce.number().int().min(1),
  familyStatus: z.string().trim().min(1, "Family status is required"),
});

const patchBatchSchema = z.object({
  guests: z.array(editGuestSchema),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params;
    const body = await req.json();
    const parsed = patchBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { guests } = parsed.data;

    await db.transaction(async (tx) => {
      // For each guest, update the Guest record and the related Family record
      for (const guest of guests) {
        // Fetch current guest to get familyId
        const currentGuest = await tx.orm.public.Guest.where((g) => g.id.eq(guest.id))
          .select("familyId")
          .first();

        if (currentGuest?.familyId) {
          await tx.orm.public.Family.where((f) => f.id.eq(currentGuest.familyId as string))
            .update({
              familyName: guest.familyName,
              side: guest.side,
            });
        }

        await tx.orm.public.Guest.where((g) => g.id.eq(guest.id))
          .update({
            fullName: guest.fullName,
            side: guest.side,
            category: guest.category || null,
            numberAttending: guest.numberAttending,
            familyStatus: guest.familyStatus,
          });
      }
    });

    return NextResponse.json({ success: true, message: "Batch updated successfully" });
  } catch (error) {
    console.error("Failed to update batch:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params;
    if (p.id === "legacy-batch") {
      const plan = db.sql.public.guest.delete().where((f, fns) => fns.eq(f.importBatchId, null)).build();
      await db.runtime().execute(plan);
      revalidatePath("/guests/import");
      revalidatePath("/");
      revalidatePath("/reports/roster");
      return NextResponse.json({ success: true, message: "Cleared all unassigned legacy guests" });
    } else {
      await db.transaction(async (tx) => {
        const guestPlan = tx.sql.public.guest.delete().where((f, fns) => fns.eq(f.importBatchId, p.id)).build();
        await tx.execute(guestPlan);
        const batchPlan = tx.sql.public.importBatch.delete().where((f, fns) => fns.eq(f.id, p.id)).build();
        await tx.execute(batchPlan);
      });
      revalidatePath("/guests/import");
      revalidatePath("/");
      revalidatePath("/reports/roster");
      return NextResponse.json({ success: true, message: "Batch and all guest rows deleted successfully" });
    }
  } catch (error) {
    console.error("Failed to delete batch:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
