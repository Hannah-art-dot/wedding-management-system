import { z } from "zod";
import { AttendanceStatus, RsvpStatus, Side, TicketStatus } from "@/lib/enums";
import { optionalEmail, optionalPhone } from "@/lib/guest-schemas";

/** Simplified guest registration (UI fields only). */
export const simpleGuestSchema = z.object({
  fullName: z.string().trim().min(1, "FullName is required"),
  familyName: z.string().trim().min(1, "FamilyName is required"),
  side: z.enum([Side.BRIDE, Side.GROOM]),
  category: z.enum([
    "BRIDES_FAMILY",
    "GROOMS_FAMILY",
    "BRIDES_FRIENDS",
    "GROOMS_FRIENDS",
    "OTHER",
  ]),
  ticketNumber: z.string().trim().min(1, "TicketNumber is required"),
  numberAllowed: z.coerce.number().int().min(1),
  /** UI may send NOT_COMING; stored as DECLINED. */
  rsvpStatus: z.enum(["CONFIRMED", "NOT_COMING", "PENDING", "MAYBE", "DECLINED"]),
  phone: optionalPhone,
  email: optionalEmail,
});

export type SimpleGuestInput = z.infer<typeof simpleGuestSchema>;

export function toStoredRsvp(
  value: SimpleGuestInput["rsvpStatus"],
): (typeof RsvpStatus)[keyof typeof RsvpStatus] {
  if (value === "NOT_COMING" || value === "DECLINED") return RsvpStatus.DECLINED;
  if (value === "CONFIRMED") return RsvpStatus.CONFIRMED;
  if (value === "MAYBE") return RsvpStatus.MAYBE;
  return RsvpStatus.PENDING;
}

export const CATEGORY_LABELS = {
  BRIDES_FAMILY: "BRIDES_FAMILY",
  GROOMS_FAMILY: "GROOMS_FAMILY",
  BRIDES_FRIENDS: "BRIDES_FRIENDS",
  GROOMS_FRIENDS: "GROOMS_FRIENDS",
  OTHER: "OTHER",
} as const;

export { AttendanceStatus, TicketStatus };
