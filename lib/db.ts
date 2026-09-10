import "temporal-polyfill/full/global";
import { db } from "@/src/prisma/db";

/** Single Prisma Next client for the app. Prefer this over legacy @prisma/client. */
export { db };
