import { UserRole, UserStatus, type UserRole as UserRoleType } from "@/lib/enums";

export const SESSION_COOKIE = "ow_session";
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_MAX_AGE_SEC = 60 * 60 * 8;

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: UserRoleType;
};

export type SessionPayload = SessionUser & {
  lastActive: number;
};

export function isAdmin(role: UserRoleType): boolean {
  return role === UserRole.ADMIN || role === UserRole.MANAGER;
}

export function canCheckIn(role: UserRoleType): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.MANAGER ||
    role === UserRole.CHECKIN_STAFF
  );
}

export function canManageGuests(role: UserRoleType): boolean {
  return isAdmin(role);
}

export function homePathForRole(role: UserRoleType): string {
  if (role === UserRole.CHECKIN_STAFF) return "/check-in";
  if (isAdmin(role)) return "/";
  return "/guests";
}

export function isActiveStatus(status: string): boolean {
  return status === UserStatus.ACTIVE;
}
