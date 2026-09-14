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

/** Invitation card status (Guest.cardStatus). */
export const CardStatus = {
  WITH_CARD: "With Card",
  WITHOUT_CARD: "Without Card",
} as const;
export type CardStatus = (typeof CardStatus)[keyof typeof CardStatus];

export const CARD_STATUS_OPTIONS = Object.values(CardStatus);

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
  UNUSED: "UNUSED",
  PARTIAL: "PARTIAL",
  USED: "USED",
  LOST: "LOST",
  CANCELLED: "CANCELLED",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

/** Pre-invited guest category presets (Add Guest form). */
export const GuestCategory = {
  BRIDES_FAMILY: "Brides_Family",
  GROOMS_FAMILY: "Grooms_Family",
  BRIDES_FRIEND: "Brides_Friend",
  GROOMS_FRIEND: "Grooms_Friend",
  VIP_FAMILY: "VIP Family",
  VVIP_FAMILY: "VVIP Family",
} as const;
export type GuestCategory = (typeof GuestCategory)[keyof typeof GuestCategory];

export const GUEST_CATEGORY_OPTIONS = Object.values(GuestCategory);

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  CONFIRMED: "Coming",
  DECLINED: "Not Coming",
  PENDING: "Pending",
  MAYBE: "Maybe",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  NOT_ISSUED: "Not Issued",
  ISSUED: "Issued",
  UNUSED: "Unused",
  PARTIAL: "Partial",
  USED: "Used",
  LOST: "Lost",
  CANCELLED: "Cancelled",
};

export const SIDE_LABELS: Record<Side, string> = {
  BRIDE: "Bride's Side",
  GROOM: "Groom's Side",
  NEUTRAL: "Neutral / Other",
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNSPECIFIED: "Unspecified",
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  NOT_ARRIVED: "Not Arrived",
  ARRIVED: "Arrived",
  NO_SHOW: "No Show",
};

/** Dinner covers: only CONFIRMED attendees count. */
export function countsTowardDinner(rsvp: RsvpStatus): boolean {
  return rsvp === RsvpStatus.CONFIRMED;
}
