import { NextResponse } from "next/server";
import { getGuestReportRows } from "@/services/analytics";

export const dynamic = "force-dynamic";

/** Live guest report rows for print / CSV / XLS export. */
export async function GET() {
  try {
    const rows = await getGuestReportRows();
    return NextResponse.json(
      { success: true, rows, generatedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err) {
    console.error("Guest report fetch failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not load guest report." },
      { status: 500 },
    );
  }
}
