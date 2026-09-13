import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  createSessionToken,
  homePathForRole,
  isActiveStatus,
  verifyPassword,
} from "@/lib/auth";
import { nowInstant } from "@/lib/time";
import { UserRole, type UserRole as UserRoleType } from "@/lib/enums";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Username and password are required." },
      { status: 400 },
    );
  }

  const username = parsed.data.username.trim();

  try {
    const user = await db.orm.public.User.where({ username }).first();
    if (!user || !isActiveStatus(user.status)) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(parsed.data.password, user.password);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 },
      );
    }

    const role = user.role as UserRoleType;
    // Primary desk roles: ADMIN and CHECKIN_STAFF (MANAGER retained as admin-capable).
    if (
      role !== UserRole.ADMIN &&
      role !== UserRole.CHECKIN_STAFF &&
      role !== UserRole.MANAGER &&
      role !== UserRole.VIEWER
    ) {
      return NextResponse.json(
        { success: false, error: "This account role is not permitted to sign in." },
        { status: 403 },
      );
    }

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      username: user.username,
      role,
    });

    await db.orm.public.AuditLog.create({
      id: randomUUID(),
      userId: user.id,
      action: "LOGIN",
      recordType: "User",
      recordId: user.id,
      metadata: JSON.stringify({ username: user.username, role }),
      timestamp: nowInstant(),
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role,
      },
      redirectTo: homePathForRole(role),
    });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });

    return res;
  } catch (err) {
    console.error("Login failed:", err);
    return NextResponse.json(
      { success: false, error: "Login failed. Please try again." },
      { status: 500 },
    );
  }
}
