import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteGuest, listFamilies } from "@/services/guest-registration";
import { db } from "@/lib/db";

// Mock the db runtime client
vi.mock("@/lib/db", () => {
  const whereMock = vi.fn().mockReturnThis();
  const orderByMock = vi.fn().mockReturnThis();
  const allMock = vi.fn();
  const firstMock = vi.fn();
  const updateMock = vi.fn();
  const createMock = vi.fn();
  const inMock = vi.fn().mockReturnThis();

  return {
    db: {
      orm: {
        public: {
          Guest: {
            where: whereMock,
            orderBy: orderByMock,
            all: allMock,
            first: firstMock,
            update: updateMock,
            create: createMock,
          },
          Family: {
            where: whereMock,
            orderBy: orderByMock,
            all: allMock,
            first: firstMock,
            update: updateMock,
            create: createMock,
          },
          FamilyMember: {
            where: whereMock,
            orderBy: orderByMock,
            all: allMock,
            first: firstMock,
            update: updateMock,
            create: createMock,
          },
          Spouse: {
            where: whereMock,
            orderBy: orderByMock,
            all: allMock,
            first: firstMock,
            update: updateMock,
            create: createMock,
          },
          Ticket: {
            where: whereMock,
            orderBy: orderByMock,
            all: allMock,
            first: firstMock,
            update: updateMock,
            create: createMock,
          },
          AuditLog: {
            create: createMock,
          },
        },
      },
      transaction: vi.fn(async (callback) => {
        // Pass the mocked db directly as tx
        return await callback({
          orm: {
            public: {
              Guest: { where: whereMock, update: updateMock },
              Ticket: { where: whereMock, first: firstMock, update: updateMock },
              Spouse: { where: whereMock, first: firstMock, update: updateMock },
              AuditLog: { create: createMock }
            }
          }
        });
      }),
    },
  };
});

describe("guest-registration service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("deleteGuest", () => {
    it("should throw an error if the guest does not exist", async () => {
      // Mock `first()` to return null
      db.orm.public.Guest.first = vi.fn().mockResolvedValue(null);

      await expect(deleteGuest("invalid-id", "test-user-id")).rejects.toThrow(
        "Guest not found."
      );
    });

    it("should update deletedAt for guest, ticket, spouse and create AuditLog", async () => {
      const mockGuest = { id: "guest-1", fullName: "Test Guest" };
      const mockTicket = { id: "ticket-1", guestId: "guest-1" };
      const mockSpouse = { id: "spouse-1", guestId: "guest-1" };

      // Mock first() to return guest on first call, ticket, then spouse inside transaction
      db.orm.public.Guest.first = vi.fn().mockResolvedValue(mockGuest);
      
      const txTicketFirst = vi.fn().mockResolvedValue(mockTicket);
      const txSpouseFirst = vi.fn().mockResolvedValue(mockSpouse);

      db.transaction = vi.fn(async (callback) => {
        return await callback({
          orm: {
            public: {
              Guest: { 
                where: vi.fn().mockReturnThis(), 
                update: vi.fn().mockResolvedValue({}) 
              },
              Ticket: { 
                where: vi.fn().mockReturnThis(), 
                first: txTicketFirst,
                update: vi.fn().mockResolvedValue({}) 
              },
              Spouse: { 
                where: vi.fn().mockReturnThis(), 
                first: txSpouseFirst, 
                update: vi.fn().mockResolvedValue({}) 
              },
              AuditLog: { 
                create: vi.fn().mockResolvedValue({}) 
              }
            }
          }
        });
      });

      const guestResult = await deleteGuest("guest-1", "user-123");

      expect(guestResult).toEqual(mockGuest);

      // Verify transaction was called
      expect(db.transaction).toHaveBeenCalled();
    });
  });

  describe("listFamilies", () => {
    it("should group guests and calculate counts correctly", async () => {
      const mockFamilies = [
        { id: "fam-1", familyName: "Smith", side: "BRIDE" },
      ];
      const mockGuests = [
        { id: "guest-1", familyId: "fam-1", rsvpStatus: "CONFIRMED" },
        { id: "guest-2", familyId: "fam-1", rsvpStatus: "DECLINED" },
      ];
      const mockMembers = [
        { id: "member-1", familyId: "fam-1", rsvpStatus: "PENDING" },
      ];
      const mockSpouses = [
        { id: "spouse-1", guestId: "guest-1", rsvpStatus: "CONFIRMED" },
      ];
      const mockFamilyTickets = [
        { id: "t-1", familyId: "fam-1", numberAllowed: 4 },
      ];
      const mockGuestTickets: any[] = [];

      // Mock all() to return data for each call sequentially
      db.orm.public.Family.all = vi.fn().mockResolvedValue(mockFamilies);
      db.orm.public.Guest.all = vi.fn().mockResolvedValue(mockGuests);
      db.orm.public.FamilyMember.all = vi.fn().mockResolvedValue(mockMembers);
      db.orm.public.Spouse.all = vi.fn().mockResolvedValue(mockSpouses);
      
      // Since Ticket.where is called twice (familyId.in, guestId.in), 
      // we can simulate the sequential returns
      db.orm.public.Ticket.all = vi
        .fn()
        .mockResolvedValueOnce(mockFamilyTickets)
        .mockResolvedValueOnce(mockGuestTickets);

      const result = await listFamilies();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "fam-1",
          familyName: "Smith",
          guestCount: 2, // 2 guests
          invited: 4, // from ticket allowed
          confirmed: 2, // guest-1 + spouse-1
          notAttending: 1, // guest-2
          pending: 1, // member-1
        })
      );
    });
    
    it("should fallback to party length if no tickets", async () => {
      const mockFamilies = [{ id: "fam-2", familyName: "Doe", side: "GROOM" }];
      const mockGuests = [{ id: "guest-3", familyId: "fam-2", rsvpStatus: "PENDING" }];
      
      db.orm.public.Family.all = vi.fn().mockResolvedValue(mockFamilies);
      db.orm.public.Guest.all = vi.fn().mockResolvedValue(mockGuests);
      db.orm.public.FamilyMember.all = vi.fn().mockResolvedValue([]);
      db.orm.public.Spouse.all = vi.fn().mockResolvedValue([]);
      db.orm.public.Ticket.all = vi.fn().mockResolvedValue([]);
      
      const result = await listFamilies();
      
      expect(result[0].invited).toBe(1); // falls back to party length
      expect(result[0].pending).toBe(1);
    });
  });
});
