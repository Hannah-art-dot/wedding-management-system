import { z } from "zod";
import {
  AttendanceStatus,
  Gender,
  RsvpStatus,
  Side,
  TicketStatus,
} from "@/lib/enums";

const phoneRegex = /^[0-9+\-\s()]{6,30}$/;

export const optionalPhone = z
  .string()
  .trim()
  .regex(phoneRegex, "Invalid phone format")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const optionalEmail = z
  .string()
  .trim()
  .email("Invalid email")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

const genderEnum = z.nativeEnum(Gender).optional();
const rsvpEnum = z.nativeEnum(RsvpStatus).default(RsvpStatus.PENDING);
const attendanceEnum = z.nativeEnum(AttendanceStatus).default(AttendanceStatus.NOT_ARRIVED);
const sideEnum = z.nativeEnum(Side).default(Side.NEUTRAL);
const ticketStatusEnum = z.nativeEnum(TicketStatus).default(TicketStatus.NOT_ISSUED);

export const spouseInputSchema = z.object({
  include: z.boolean().default(false),
  name: z.string().trim().optional(),
  gender: genderEnum,
  rsvpStatus: rsvpEnum,
  ticketStatus: ticketStatusEnum,
  attendanceStatus: attendanceEnum,
});

export const familyMemberInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  relationship: z.string().trim().min(1, "Relationship is required"),
  age: z.coerce.number().int().min(0).max(130).optional().nullable(),
  rsvpStatus: rsvpEnum,
  attendanceStatus: attendanceEnum,
});

export const ticketInputSchema = z.object({
  include: z.boolean().default(false),
  ticketNumber: z.string().trim().optional(),
  numberAllowed: z.coerce.number().int().min(1).default(1),
  status: ticketStatusEnum,
  issueDate: z.string().optional().or(z.literal("")),
  assignTo: z.enum(["guest", "family"]).default("guest"),
});

export const familyCreateSchema = z.object({
  familyName: z.string().trim().min(1, "Family name is required"),
  side: sideEnum,
  contactPerson: z.string().trim().max(150).optional().or(z.literal("")),
  phone: optionalPhone,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const guestRegistrationSchema = z
  .object({
    // Guest — SRS §5
    fullName: z.string().trim().min(1, "Full name is required"),
    gender: genderEnum,
    phone: optionalPhone,
    email: optionalEmail,
    category: z.string().trim().max(80).optional().or(z.literal("")),
    side: sideEnum,
    rsvpStatus: rsvpEnum,
    numberAttending: z.coerce.number().int().min(0).max(50).optional().nullable(),
    specialNotes: z.string().trim().max(4000).optional().or(z.literal("")),
    attendanceStatus: attendanceEnum,

    // Family — SRS §6
    familyMode: z.enum(["new", "existing", "none"]).default("new"),
    familyId: z.string().uuid().optional().nullable(),
    family: familyCreateSchema.optional(),

    // Spouse — SRS §7
    spouse: spouseInputSchema.optional(),

    // Family members / children — SRS §7
    familyMembers: z.array(familyMemberInputSchema).default([]),

    // Ticket — SRS §8
    ticket: ticketInputSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.familyMode === "existing" && !data.familyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select an existing family.",
        path: ["familyId"],
      });
    }
    if (data.familyMode === "new") {
      if (!data.family?.familyName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Family name is required.",
          path: ["family", "familyName"],
        });
      }
    }
    if (data.spouse?.include && !data.spouse.name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Spouse name is required when including a spouse.",
        path: ["spouse", "name"],
      });
    }
    if (data.ticket?.include && !data.ticket.ticketNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ticket number is required when assigning a ticket.",
        path: ["ticket", "ticketNumber"],
      });
    }
    if (data.ticket?.include && data.ticket.assignTo === "family" && data.familyMode === "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A family is required to assign the ticket to the family.",
        path: ["ticket", "assignTo"],
      });
    }
    if (
      data.familyMembers.length > 0 &&
      data.familyMode === "none"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Family members require a family unit.",
        path: ["familyMembers"],
      });
    }
  });

export type GuestRegistrationInput = z.infer<typeof guestRegistrationSchema>;
export type FamilyCreateInput = z.infer<typeof familyCreateSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberInputSchema>;
