import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getSession, hashPassword, isAdmin } from "@/lib/auth";
import { UserRole, UserStatus } from "@/lib/enums";
import { nowInstant } from "@/lib/time";

export const dynamic = "force-dynamic";

const MANAGEABLE_ROLES = [UserRole.ADMIN, UserRole.CHECKIN_STAFF] as const;

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  username: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username may only contain letters, numbers, . _ -"),
  password: z.string().min(4).max(128),
  role: z.enum(MANAGEABLE_ROLES),
});

async function requireAdmin() {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  try {
    const users = await db.orm.public.User.orderBy((u) => u.username.asc()).all();
    const activeUsers = users.filter((u) => u.status !== UserStatus.DELETED);
    const guests = await db.orm.public.Guest.where((g) => g.deletedAt.isNull())
      .select("id", "checkedInByUserId", "attendanceStatus")
      .all();

    const checkInCounts = new Map<string, number>();
    for (const g of guests) {
      if (g.attendanceStatus !== "ARRIVED" || !g.checkedInByUserId) continue;
      checkInCounts.set(
        g.checkedInByUserId,
        (checkInCounts.get(g.checkedInByUserId) ?? 0) + 1,
      );
    }

    return NextResponse.json({
      success: true,
      users: activeUsers.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        status: u.status,
        checkIns: checkInCounts.get(u.id) ?? 0,
        createdAt: String(u.createdAt),
        updatedAt: String(u.updatedAt),
      })),
    });
  } catch (err) {
    console.error("List users failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not load users." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { name, username, password, role } = parsed.data;
  const existing = await db.orm.public.User.where({ username }).first();
  if (existing) {
    return NextResponse.json(
      { success: false, error: `Username "${username}" is already taken.` },
      { status: 409 },
    );
  }

  try {
    const now = nowInstant();
    const user = await db.orm.public.User.create({
      id: randomUUID(),
      name,
      username,
      password: await hashPassword(password),
      role,
      status: UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });

    await db.orm.public.AuditLog.create({
      id: randomUUID(),
      userId: session.id,
      action: "USER_CREATE",
      recordType: "User",
      recordId: user.id,
      metadata: JSON.stringify({ username, role }),
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      message: "User created.",
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Create user failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not create user." },
      { status: 500 },
    );
  }
}
