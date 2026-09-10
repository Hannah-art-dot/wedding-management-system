/** Domain enums aligned with src/prisma/contract.prisma */

export const UserRole = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CHECKIN_STAFF: "CHECKIN_STAFF",
  VIEWER: "VIEWER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
  DELETED: "DELETED",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const Side = {
  BRIDE: "BRIDE",
  GROOM: "GROOM",
  NEUTRAL: "NEUTRAL",
} as const;
export type Side = (typeof Side)[keyof typeof Side];

export const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
  UNSPECIFIED: "UNSPECIFIED",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const RsvpStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  DECLINED: "DECLINED",
  MAYBE: "MAYBE",
} as const;
export type RsvpStatus = (typeof RsvpStatus)[keyof typeof RsvpStatus];

export const AttendanceStatus = {
  NOT_ARRIVED: "NOT_ARRIVED",
  ARRIVED: "ARRIVED",
  NO_SHOW: "NO_SHOW",
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const TicketStatus = {
  NOT_ISSUED: "NOT_ISSUED",
  ISSUED: "ISSUED",
  PARTIAL: "PARTIAL",
  USED: "USED",
  LOST: "LOST",
  CANCELLED: "CANCELLED",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

/** Dinner covers: only CONFIRMED attendees count. */
export function countsTowardDinner(rsvp: RsvpStatus): boolean {
  return rsvp === RsvpStatus.CONFIRMED;
}
