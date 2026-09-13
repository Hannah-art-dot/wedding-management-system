import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAuthSecretKey } from "@/lib/auth-secret";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  type SessionPayload,
  type SessionUser,
} from "@/lib/auth-shared";

export {
  SESSION_COOKIE,
  IDLE_TIMEOUT_MS,
  SESSION_MAX_AGE_SEC,
  isAdmin,
  canCheckIn,
  canManageGuests,
  homePathForRole,
  isActiveStatus,
  type SessionUser,
  type SessionPayload,
} from "@/lib/auth-shared";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash.startsWith("$2")) {
    return plain === hash;
  }
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    lastActive: Date.now(),
  };
  const key = await getAuthSecretKey();
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .setJti(randomBytes(8).toString("hex"))
    .sign(key);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const key = await getAuthSecretKey();
    const { payload } = await jwtVerify(token, key);
    const role = payload.role as SessionUser["role"] | undefined;
    const id = payload.id as string | undefined;
    const username = payload.username as string | undefined;
    const name = payload.name as string | undefined;
    const lastActive = payload.lastActive as number | undefined;
    if (!id || !username || !name || !role || typeof lastActive !== "number") return null;
    return { id, name, username, role, lastActive };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
