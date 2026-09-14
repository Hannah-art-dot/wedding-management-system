import { NextResponse } from "next/server";
import {
  GUEST_REPORT_HEADERS,
  guestRowsToCsv,
} from "@/components/reports/report-shared";
import { getGuestReportRows } from "@/services/analytics";

export const dynamic = "force-dynamic";

/**
 * Live guest report for UI + print + CSV.
 * Always the same dataset from getGuestReportRows(); CSV uses guestRowsToCsv()
 * so columns/cells match the on-screen table exactly.
 */
export async function GET(req: Request) {
  try {
    const rows = await getGuestReportRows();
    const url = new URL(req.url);
    const format = url.searchParams.get("format");

    if (format === "csv") {
      const csv = guestRowsToCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="our-wedding-complete-guest-list.csv"',
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        rows,
        columns: [...GUEST_REPORT_HEADERS],
        generatedAt: new Date().toISOString(),
      },
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
