import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getSession, hashPassword, isAdmin } from "@/lib/auth";
import { UserRole, UserStatus } from "@/lib/enums";
import { nowInstant } from "@/lib/time";

export const dynamic = "force-dynamic";

export const DEFAULT_ADMIN_PASSWORD = "admin@123";
export const DEFAULT_STAFF_PASSWORD = "staff@321";

async function resetDefaultUserPasswords(actorUserId: string | null) {
  const now = nowInstant();
  const adminHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  const staffHash = await hashPassword(DEFAULT_STAFF_PASSWORD);
  const updated: string[] = [];

  const admin = await db.orm.public.User.where({ username: "admin" }).first();
  if (admin) {
    await db.orm.public.User.where({ id: admin.id }).update({
      password: adminHash,
      status: UserStatus.ACTIVE,
      role: UserRole.ADMIN,
      updatedAt: now,
    });
    updated.push("admin");
  }

  const staff = await db.orm.public.User.where({ username: "staff" }).first();
  if (staff) {
    await db.orm.public.User.where({ id: staff.id }).update({
      password: staffHash,
      status: UserStatus.ACTIVE,
      role: UserRole.CHECKIN_STAFF,
      updatedAt: now,
    });
    updated.push("staff");
  }

  if (updated.length === 0) {
    return { ok: false as const, error: "No users named admin or staff were found to reset." };
  }

  await db.orm.public.AuditLog.create({
    id: randomUUID(),
    userId: actorUserId,
    action: "USER_RESET_DEFAULT_PASSWORDS",
    recordType: "User",
    recordId: null,
    metadata: JSON.stringify({ updated }),
    timestamp: now,
  });

  return {
    ok: true as const,
    updated,
    accounts: updated.map((username) => ({
      username,
      passwordHint: username === "admin" ? DEFAULT_ADMIN_PASSWORD : DEFAULT_STAFF_PASSWORD,
    })),
  };
}

/**
 * Seeds the two primary SRS roles when the user table is empty:
 * - admin / admin@123  → ADMIN
 * - staff / staff@321  → CHECKIN_STAFF
 *
 * If users already exist, POST `{ "resetDefaultPasswords": true }`:
 * - allowed for authenticated ADMIN always
 * - also allowed unauthenticated in non-production (local/dev unlock)
 */
export async function POST(req: NextRequest) {
  let body: { resetDefaultPasswords?: boolean } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as { resetDefaultPasswords?: boolean };
  } catch {
    body = {};
  }

  try {
    const existing = await db.orm.public.User.select("id").limit(1).all();

    if (existing.length > 0) {
      if (!body.resetDefaultPasswords) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Users already exist. Click “Reset default passwords” on the login page, or POST {"resetDefaultPasswords":true} to set admin/admin@123 and staff/staff@321.',
            canResetDefaults: true,
          },
          { status: 409 },
        );
      }

      const session = await getSession();
      const isDev = process.env.NODE_ENV !== "production";
      if ((!session || !isAdmin(session.role)) && !isDev) {
        return NextResponse.json(
          {
            success: false,
            error: "Admin session required to reset default passwords in production.",
          },
          { status: 403 },
        );
      }

      const result = await resetDefaultUserPasswords(session?.id ?? null);
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Reset passwords for: ${result.updated.join(", ")}. Sign in with admin/admin@123 or staff/staff@321.`,
        accounts: result.accounts,
      });
    }

    const now = nowInstant();
    const adminHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    const staffHash = await hashPassword(DEFAULT_STAFF_PASSWORD);

    await db.orm.public.User.create({
      id: randomUUID(),
      name: "Wedding Administrator",
      username: "admin",
      password: adminHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });

    await db.orm.public.User.create({
      id: randomUUID(),
      name: "Check-in Staff",
      username: "staff",
      password: staffHash,
      role: UserRole.CHECKIN_STAFF,
      status: UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: "Seeded ADMIN and CHECKIN_STAFF accounts.",
      accounts: [
        { username: "admin", role: UserRole.ADMIN, passwordHint: DEFAULT_ADMIN_PASSWORD },
        { username: "staff", role: UserRole.CHECKIN_STAFF, passwordHint: DEFAULT_STAFF_PASSWORD },
      ],
    });
  } catch (err) {
    console.error("Seed failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not seed users." },
      { status: 500 },
    );
  }
}
