import { NextRequest, NextResponse } from "next/server";
import { searchForCheckIn } from "@/services/check-in";

export const dynamic = "force-dynamic";

/** GET /api/check-in/search?q=... — text lookup by full name or phone. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({
      success: true,
      results: [],
      message: "Type at least 2 characters to search.",
    });
  }

  try {
    const results = await searchForCheckIn(q);
    return NextResponse.json({
      success: true,
      results,
      query: q,
    });
  } catch (err) {
    console.error("Check-in search failed:", err);
    return NextResponse.json(
      { success: false, error: "Search failed. Please try again." },
      { status: 500 },
    );
  }
}
