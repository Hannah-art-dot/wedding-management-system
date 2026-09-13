import { NextResponse } from "next/server";
import { nextTicketNumber } from "@/services/simple-guest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ticketNumber = await nextTicketNumber();
    return NextResponse.json({ success: true, ticketNumber });
  } catch (err) {
    console.error("next-ticket failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not allocate ticket number.", ticketNumber: "T-00001" },
      { status: 500 },
    );
  }
}
