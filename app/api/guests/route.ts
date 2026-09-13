import { NextRequest, NextResponse } from "next/server";
import { simpleGuestSchema } from "@/lib/simple-guest";
import { registerSimpleGuest } from "@/services/simple-guest";

export const dynamic = "force-dynamic";

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

  const parsed = simpleGuestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation failed.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await registerSimpleGuest(parsed.data);
    return NextResponse.json({
      success: true,
      message: "Guest saved.",
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not register guest.";
    const status = /already exists/i.test(message) ? 409 : 500;
    console.error("Guest registration failed:", err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
