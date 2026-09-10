import "temporal-polyfill/full/global";

/** Current instant for Prisma Next timestamptz fields (Temporal.Instant). */
export function nowInstant(): Temporal.Instant {
  return Temporal.Now.instant();
}

/** Convert a JS Date (e.g. from Zod) to Temporal.Instant. */
export function toInstant(value: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(value.getTime());
}
