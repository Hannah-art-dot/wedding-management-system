import "temporal-polyfill/full/global";
import "dotenv/config";
import { Pool } from "pg";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

/**
 * Runtime connection URL.
 * Prefer DATABASE_POOL_URL (PgBouncer / Supabase transaction pooler / Neon pooler)
 * for the Next.js app; fall back to DATABASE_URL.
 *
 * Migrations should use DATABASE_DIRECT_URL (or DATABASE_URL) via prisma.config.ts —
 * session/direct mode, not transaction pooler.
 */
function resolveRuntimeDatabaseUrl(): string | undefined {
  const pooled = process.env["DATABASE_POOL_URL"]?.trim();
  const primary = process.env["DATABASE_URL"]?.trim();
  return pooled || primary || undefined;
}

function resolvePoolMax(): number | null {
  const raw = process.env["DATABASE_POOL_MAX"]?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

const connectionTimeoutMillis = Number(
  process.env["DATABASE_POOL_CONNECTION_TIMEOUT_MS"] ?? 20_000,
);
const idleTimeoutMillis = Number(
  process.env["DATABASE_POOL_IDLE_TIMEOUT_MS"] ?? 30_000,
);

const runtimeUrl = resolveRuntimeDatabaseUrl();
const poolMax = resolvePoolMax();

/**
 * Single Prisma Next client for the app process.
 * - Default: factory-owned pool + poolOptions (compatible with pooled URLs).
 * - Optional: BYO `pg.Pool` when DATABASE_POOL_MAX is set (controls max clients).
 */
export const db =
  poolMax != null && runtimeUrl
    ? postgres<Contract>({
        contractJson,
        pg: new Pool({
          connectionString: runtimeUrl,
          max: poolMax,
          connectionTimeoutMillis,
          idleTimeoutMillis,
          allowExitOnIdle: true,
        }),
      })
    : postgres<Contract>({
        contractJson,
        url: runtimeUrl,
        poolOptions: {
          connectionTimeoutMillis,
          idleTimeoutMillis,
        },
      });
