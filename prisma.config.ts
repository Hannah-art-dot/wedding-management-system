import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as definePostgresConfig } from "@prisma/orm-postgres/config";

/**
 * CLI / migration connection.
 * Prefer DATABASE_DIRECT_URL (session / direct Postgres) so migrations and
 * contract verify are not run through a transaction pooler.
 * Falls back to DATABASE_URL when no direct URL is configured.
 */
const migrationUrl =
  process.env.DATABASE_DIRECT_URL?.trim() || process.env.DATABASE_URL!;

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: "src/prisma/contract.prisma",
    db: {
      connection: migrationUrl,
    },
  }),
});
