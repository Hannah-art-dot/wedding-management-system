import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/health — load-balancer / uptime probe.
 * Pings PostgreSQL with a lightweight aggregate and returns 200 when reachable.
 */
export async function GET() {
  const started = Date.now();
  try {
    const ping = await db.orm.public.User.aggregate((a) => ({
      ok: a.count(),
    }));

    return NextResponse.json(
      {
        status: "ok",
        database: "up",
        latencyMs: Date.now() - started,
        checkedAt: new Date().toISOString(),
        // Prove the round-trip completed without exposing counts publicly.
        dbReachable: typeof ping.ok === "number",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json(
      {
        status: "error",
        database: "down",
        latencyMs: Date.now() - started,
        checkedAt: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}
