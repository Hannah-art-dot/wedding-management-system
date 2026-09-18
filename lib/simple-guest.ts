import { z } from "zod";
import { AttendanceStatus, CardStatus, RsvpStatus, Side, TicketStatus } from "@/lib/enums";
import { optionalPhone } from "@/lib/guest-schemas";

/** Pre-invited categories only — used by Add Guest form / registration API. */
export const PRE_INVITED_CATEGORIES = [
  "Brides_Family",
  "Grooms_Family",
  "Brides_Friend",
  "Grooms_Friend",
  "VIP Family",
  "VVIP Family",
  "Crew",
] as const;

export type PreInvitedCategory = (typeof PRE_INVITED_CATEGORIES)[number];

export const CARD_STATUS_VALUES = [
  CardStatus.WITH_CARD,
  CardStatus.WITHOUT_CARD,
] as const;

export type CardStatusValue = (typeof CARD_STATUS_VALUES)[number];

/** All stored Guest.category values for labels / reports. */
export const GUEST_CATEGORIES = [...PRE_INVITED_CATEGORIES] as const;

export type GuestCategoryValue = (typeof GUEST_CATEGORIES)[number];

/** Simplified guest registration (Add Guest form fields only). */
export const simpleGuestSchema = z.object({
  fullName: z.string().trim().min(1, "Full Name is required"),
  phone: optionalPhone,
  familyName: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  side: z.enum([Side.BRIDE, Side.GROOM]),
  category: z.enum(PRE_INVITED_CATEGORIES),
  familyStatus: z.enum(["Individual", "Spouse", "Family", "Group"]).default("Individual"),
  numberAllowed: z.coerce.number().int().min(1),
  cardStatus: z.enum(CARD_STATUS_VALUES).default(CardStatus.WITH_CARD),
});

export type SimpleGuestInput = z.infer<typeof simpleGuestSchema>;

export const CATEGORY_LABELS = Object.fromEntries(
  GUEST_CATEGORIES.map((c) => [c, c]),
) as Record<GuestCategoryValue, GuestCategoryValue>;

export { AttendanceStatus, CardStatus, RsvpStatus, TicketStatus, Side };
