import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkInGuest } from "@/services/check-in";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  guestId: z.string().uuid("guestId must be a valid UUID"),
  checkedInByUserId: z.string().uuid().optional(),
});

/** POST /api/check-in — mark a guest ARRIVED (text-search check-in, no QR). */
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid check-in payload.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const result = await checkInGuest(parsed.data.guestId, {
      checkedInByUserId: parsed.data.checkedInByUserId,
    });

    if (!result.ok) {
      const status =
        result.status === "not_found"
          ? 404
          : result.status === "already_checked_in"
            ? 409
            : result.status === "ticket_blocked"
              ? 409
              : 400;
      return NextResponse.json(
        {
          success: false,
          status: result.status,
          message: result.message,
          guest: result.guest ?? null,
        },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      message: result.message,
      guest: result.guest,
    });
  } catch (err) {
    console.error("Check-in failed:", err);
    return NextResponse.json(
      { success: false, error: "Check-in failed. Please try again." },
      { status: 500 },
    );
  }
}
