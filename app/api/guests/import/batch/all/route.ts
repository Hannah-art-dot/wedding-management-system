import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const batches = await db.orm.public.ImportBatch.orderBy((b) => b.createdAt.desc())
      .select("id", "fileName", "rowCount", "createdAt")
      .include("guests", (guest) => 
        guest.select("id", "fullName", "familyId", "side", "category", "numberAttending", "familyStatus")
             .include("family", (family) => family.select("familyName"))
      )
      .all();

    const legacyGuests = await db.orm.public.Guest.where((g) => g.importBatchId.eq(null))
      .select("id", "fullName", "familyId", "side", "category", "numberAttending", "familyStatus")
      .include("family", (family) => family.select("familyName"))
      .all();

    if (legacyGuests.length > 0) {
      batches.push({
        id: "legacy-batch",
        fileName: "Previous Import (Unassigned Records)",
        rowCount: legacyGuests.length,
        createdAt: new Date(0), // Push to bottom of list conceptually
        guests: legacyGuests,
      } as any);
    }

    return NextResponse.json({ success: true, batches });
  } catch (error) {
    console.error("Failed to fetch latest batch:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
