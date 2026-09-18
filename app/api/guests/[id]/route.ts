import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { deleteGuest } from "@/services/guest-registration";

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
    const guest = await deleteGuest(id, session.id);

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

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await ctx.params;
  
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const { updateGuestSimple } = await import("@/services/guest-registration");
    await updateGuestSimple(id, body, session.id);
    return NextResponse.json({ success: true, message: "Guest updated successfully." });
  } catch (err) {
    console.error("Update guest failed:", err);
    return NextResponse.json({ success: false, error: "Could not update guest." }, { status: 500 });
  }
}
