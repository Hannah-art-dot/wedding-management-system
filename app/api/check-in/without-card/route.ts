import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CardStatus } from "@/lib/enums";
import { checkInWithCardStatus } from "@/services/check-in";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  guestId: z.string().uuid("Guest is required for Without Card."),
  checkedInByUserId: z.string().uuid().optional(),
});

/** POST /api/check-in/without-card — check in and set Card Status to Without Card. */
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
        error: parsed.error.issues[0]?.message ?? "Invalid Without Card payload.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await checkInWithCardStatus({
      guestId: parsed.data.guestId,
      cardStatus: CardStatus.WITHOUT_CARD,
      checkedInByUserId: parsed.data.checkedInByUserId,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          status: result.status,
          message: result.message,
          guest: result.guest ?? null,
        },
        { status: result.status === "error" || result.status === "not_found" ? 400 : 409 },
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      message: result.message,
      guest: result.guest,
    });
  } catch (err) {
    console.error("Without Card check-in failed:", err);
    return NextResponse.json(
      { success: false, error: "Without Card check-in failed. Please try again." },
      { status: 500 },
    );
  }
}
