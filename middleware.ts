import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAuthSecretKey } from "@/lib/auth-secret";
import {
  SESSION_COOKIE,
  canCheckIn,
  canManageGuests,
  homePathForRole,
  type SessionPayload,
} from "@/lib/auth-shared";
import { UserRole, type UserRole as UserRoleType } from "@/lib/enums";

async function readSession(req: NextRequest): Promise<Pick<SessionPayload, "id" | "role" | "lastActive"> | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const key = await getAuthSecretKey();
    const { payload } = await jwtVerify(token, key);
    const id = payload.id as string | undefined;
    const role = payload.role as UserRoleType | undefined;
    const lastActive = payload.lastActive as number | undefined;
    if (!id || !role || typeof lastActive !== "number") return null;
    return { id, role, lastActive };
  } catch {
    return null;
  }
}

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/seed", "/api/health"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const session = await readSession(req);

  if (pathname.startsWith("/api/auth/logout") || pathname.startsWith("/api/auth/me")) {
    return NextResponse.next();
  }

  if (isPublic) {
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL(homePathForRole(session.role), req.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (session.role === UserRole.CHECKIN_STAFF) {
    const allowed =
      pathname === "/check-in" ||
      pathname.startsWith("/api/check-in") ||
      pathname.startsWith("/api/auth/");
    if (!allowed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/check-in", req.url));
    }
  }

  if (
    (pathname.startsWith("/guests") ||
      pathname.startsWith("/api/guests") ||
      pathname.startsWith("/families") ||
      pathname.startsWith("/api/families") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/api/reports") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/users") ||
      pathname.startsWith("/api/users")) &&
    !canManageGuests(session.role)
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.redirect(new URL(homePathForRole(session.role), req.url));
  }

  if (pathname.startsWith("/api/check-in") && !canCheckIn(session.role)) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  if (pathname === "/" && session.role === UserRole.CHECKIN_STAFF) {
    return NextResponse.redirect(new URL("/check-in", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
