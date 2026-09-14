import { NextResponse } from "next/server";
import { getDashboardAnalytics } from "@/services/analytics";

export const dynamic = "force-dynamic";

/** Live dashboard metrics for admin polling. */
export async function GET() {
  try {
    const data = await getDashboardAnalytics();
    return NextResponse.json(
      { success: true, ...data },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err) {
    console.error("Dashboard fetch failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not load dashboard." },
      { status: 500 },
    );
  }
}
