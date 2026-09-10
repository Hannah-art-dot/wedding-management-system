/** Soft-delete helpers — Prisma Next has no built-in paranoid mode. */

export function isActiveRecord(row: { deletedAt: Temporal.Instant | null }): boolean {
  return row.deletedAt == null;
}

/** Use in `.where({ deletedAt: NOT_DELETED })` filters. */
export const NOT_DELETED = null;
