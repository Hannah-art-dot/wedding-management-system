import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getSession, hashPassword, isAdmin } from "@/lib/auth";
import { UserRole, UserStatus } from "@/lib/enums";
import { nowInstant } from "@/lib/time";

export const dynamic = "force-dynamic";

const MANAGEABLE_ROLES = [UserRole.ADMIN, UserRole.CHECKIN_STAFF] as const;

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(MANAGEABLE_ROLES).optional(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.DISABLED, UserStatus.DELETED]).optional(),
  password: z.string().min(4).max(128).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) return null;
  return session;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
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

  const user = await db.orm.public.User.where({ id }).first();
  if (!user || user.status === UserStatus.DELETED) {
    return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
  }

  // Prevent disabling/deleting the last active admin
  if (
    (parsed.data.status === UserStatus.DISABLED || parsed.data.status === UserStatus.DELETED) &&
    user.role === UserRole.ADMIN
  ) {
    const admins = await db.orm.public.User.where({ role: UserRole.ADMIN })
      .where({ status: UserStatus.ACTIVE })
      .all();
    if (admins.length <= 1 && user.status === UserStatus.ACTIVE) {
      return NextResponse.json(
        { success: false, error: "Cannot disable or delete the last active admin." },
        { status: 400 },
      );
    }
  }

  if (
    parsed.data.role === UserRole.CHECKIN_STAFF &&
    user.role === UserRole.ADMIN &&
    user.status === UserStatus.ACTIVE
  ) {
    const admins = await db.orm.public.User.where({ role: UserRole.ADMIN })
      .where({ status: UserStatus.ACTIVE })
      .all();
    if (admins.length <= 1) {
      return NextResponse.json(
        { success: false, error: "Cannot demote the last active admin." },
        { status: 400 },
      );
    }
  }

  const patch: Record<string, unknown> = {
    updatedAt: nowInstant(),
  };
  if (parsed.data.name != null) patch.name = parsed.data.name;
  if (parsed.data.role != null) patch.role = parsed.data.role;
  if (parsed.data.status != null) patch.status = parsed.data.status;
  if (parsed.data.password != null) {
    patch.password = await hashPassword(parsed.data.password);
  }

  try {
    await db.orm.public.User.where({ id }).update(patch);
    await db.orm.public.AuditLog.create({
      id: randomUUID(),
      userId: session.id,
      action: "USER_UPDATE",
      recordType: "User",
      recordId: id,
      metadata: JSON.stringify({
        fields: Object.keys(parsed.data),
        passwordChanged: Boolean(parsed.data.password),
      }),
      timestamp: nowInstant(),
    });

    const updated = await db.orm.public.User.where({ id }).first();
    return NextResponse.json({
      success: true,
      message: "User updated.",
      user: updated
        ? {
            id: updated.id,
            name: updated.name,
            username: updated.username,
            role: updated.role,
            status: updated.status,
          }
        : null,
    });
  } catch (err) {
    console.error("Update user failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not update user." },
      { status: 500 },
    );
  }
}
