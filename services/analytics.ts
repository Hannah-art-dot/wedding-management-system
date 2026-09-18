import { db } from "@/lib/db";
import {
  AttendanceStatus,
  RsvpStatus,
  Side,
  TicketStatus,
  type RsvpStatus as RsvpStatusType,
  type Side as SideType,
} from "@/lib/enums";

export type SideMetrics = {
  families: number;
  invited: number;
  withTickets: number;
  withoutTickets: number;
  coming: number;
  notComing: number;
  pending: number;
  expectedDinner: number;
  /** Guests/seats checked in on this side (live). */
  arrived: number;
};

export type CheckInEntry = {
  id: string;
  guestName: string;
  familyName: string | null;
  side: "Bride" | "Groom" | "General";
  category: string | null;
  familyStatus: string | null;
  numberAllowed: number;
  time: string;
};

export type DashboardSummary = {
  totalFamilies: number;
  totalInvited: number;
  withTickets: number;
  withoutTickets: number;
  confirmed: number;
  notComing: number;
  pending: number;
  maybe: number;
  expectedDinner: number;
  confirmedSpouses: number;
  confirmedFamilyMembers: number;
  /** People arrived via check-in (ticket seats used + arrived guests without tickets). */
  arrived: number;
  /** Invited seats not yet checked in (totalInvited − arrived). */
  unarrived: number;
  /** Live arrival rate: arrived / totalInvited × 100 (0 if no invitees). */
  arrivalRatePercent: number;
  generatedAt: string;
};

export type BrideGroomMatrix = {
  bride: SideMetrics;
  groom: SideMetrics;
  neutral: SideMetrics;
  total: SideMetrics;
};

export type GuestReportRow = {
  guestId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  familyName: string | null;
  category: string | null;
  cardStatus: string | null;
  side: SideType;
  rsvpStatus: RsvpStatusType;
  attendanceStatus: string;
  numberAttending: number | null;
  ticketNumber: string | null;
  numberAllowed: number | null;
  numberUsed: number | null;
  hasTicket: boolean;
  spouseName: string | null;
  spouseRsvp: RsvpStatusType | null;
  specialNotes: string | null;
  familyStatus: string | null;
};

export type FamilyReportRow = {
  familyId: string;
  familyName: string;
  side: SideType;
  contactPerson: string | null;
  phone: string | null;
  guestCount: number;
  invited: number;
  coming: number;
  notComing: number;
  pending: number;
  expectedDinner: number;
  ticketNumbers: string[];
};

function emptySide(): SideMetrics {
  return {
    families: 0,
    invited: 0,
    withTickets: 0,
    withoutTickets: 0,
    coming: 0,
    notComing: 0,
    pending: 0,
    expectedDinner: 0,
    arrived: 0,
  };
}

function addMetrics(a: SideMetrics, b: SideMetrics): SideMetrics {
  return {
    families: a.families + b.families,
    invited: a.invited + b.invited,
    withTickets: a.withTickets + b.withTickets,
    withoutTickets: a.withoutTickets + b.withoutTickets,
    coming: a.coming + b.coming,
    notComing: a.notComing + b.notComing,
    pending: a.pending + b.pending,
    expectedDinner: a.expectedDinner + b.expectedDinner,
    arrived: a.arrived + b.arrived,
  };
}

function bucketSide(side: string): "bride" | "groom" | "neutral" {
  if (side === Side.BRIDE) return "bride";
  if (side === Side.GROOM) return "groom";
  return "neutral";
}

type Loaded = {
  families: Array<{
    id: string;
    familyName: string;
    side: string;
    contactPerson: string | null;
    phone: string | null;
    notes: string | null;
  }>;
  guests: Array<{
    id: string;
    familyId: string | null;
    fullName: string;
    phone: string | null;
    email: string | null;
    category: string | null;
    cardStatus: string | null;
    side: string;
    rsvpStatus: string;
    attendanceStatus: string;
    numberAttending: number | null;
    specialNotes: string | null;
    familyStatus: string | null;
  }>;
  spouses: Array<{
    id: string;
    guestId: string;
    name: string;
    rsvpStatus: string;
  }>;
  members: Array<{
    id: string;
    familyId: string;
    name: string;
    relationship: string;
    age: number | null;
    rsvpStatus: string;
  }>;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    familyId: string | null;
    guestId: string | null;
    numberAllowed: number;
    numberUsed: number;
    status: string;
  }>;
};

async function loadActiveDataset(): Promise<Loaded> {
  const [families, guests, spouses, members, tickets] = await Promise.all([
    db.orm.public.Family.where((f) => f.deletedAt.isNull())
      .select("id", "familyName", "side", "contactPerson", "phone", "notes")
      .all(),
    db.orm.public.Guest.where((g) => g.deletedAt.isNull())
      .select(
        "id",
        "familyId",
        "fullName",
        "phone",
        "email",
        "category",
        "cardStatus",
        "side",
        "rsvpStatus",
        "attendanceStatus",
        "numberAttending",
        "specialNotes",
        "familyStatus",
      )
      .all(),
    db.orm.public.Spouse.where((s) => s.deletedAt.isNull())
      .select("id", "guestId", "name", "rsvpStatus")
      .all(),
    db.orm.public.FamilyMember.where((m) => m.deletedAt.isNull())
      .select("id", "familyId", "name", "relationship", "age", "rsvpStatus")
      .all(),
    db.orm.public.Ticket.where((t) => t.deletedAt.isNull())
      .select(
        "id",
        "ticketNumber",
        "familyId",
        "guestId",
        "numberAllowed",
        "numberUsed",
        "status",
      )
      .all(),
  ]);

  return {
    families: families.map((f) => ({
      id: f.id,
      familyName: f.familyName,
      side: f.side,
      contactPerson: f.contactPerson,
      phone: f.phone,
      notes: f.notes,
    })),
    guests: guests.map((g) => ({
      id: g.id,
      familyId: g.familyId,
      fullName: g.fullName,
      phone: g.phone,
      email: g.email,
      category: g.category,
      cardStatus: g.cardStatus ?? "",
      side: g.side,
      rsvpStatus: g.rsvpStatus,
      attendanceStatus: g.attendanceStatus,
      numberAttending: g.numberAttending,
      specialNotes: g.specialNotes,
      familyStatus: g.familyStatus ?? null,
    })),
    spouses: spouses.map((s) => ({
      id: s.id,
      guestId: s.guestId,
      name: s.name,
      rsvpStatus: s.rsvpStatus,
    })),
    members: members.map((m) => ({
      id: m.id,
      familyId: m.familyId,
      name: m.name,
      relationship: m.relationship,
      age: m.age,
      rsvpStatus: m.rsvpStatus,
    })),
    tickets: tickets
      .filter((t) => t.status !== TicketStatus.CANCELLED)
      .map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        familyId: t.familyId,
        guestId: t.guestId,
        numberAllowed: t.numberAllowed,
        numberUsed: t.numberUsed,
        status: t.status,
      })),
  };
}

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Dashboard metrics via SQL COUNT/SUM aggregates (+ lean ticket/guest scans
 * only where attribution logic cannot be expressed as a single aggregate).
 */
export async function getDashboardAnalytics(): Promise<{
  summary: DashboardSummary;
  matrix: BrideGroomMatrix;
  recentCheckIns: CheckInEntry[];
}> {
  const activeTickets = () =>
    db.orm.public.Ticket.where((t) => t.deletedAt.isNull()).where(
      (t) => t.status.neq(TicketStatus.CANCELLED),
    );

  const [
    familiesBySide,
    guestRsvpBySide,
    confirmedSpousesByGuestSide,
    confirmedMembersByFamilySide,
    leanGuests,
    leanTickets,
  ] = await Promise.all([
    db.orm.public.Family.where((f) => f.deletedAt.isNull())
      .groupBy("side")
      .aggregate((a) => ({ families: a.count() })),

    db.orm.public.Guest.where((g) => g.deletedAt.isNull())
      .groupBy("side", "rsvpStatus")
      .aggregate((a) => ({ count: a.count() })),

    db.orm.public.Spouse.where((s) => s.deletedAt.isNull())
      .where({ rsvpStatus: RsvpStatus.CONFIRMED })
      .include("guest", (g) => g.select("side"))
      .select("id", "guestId")
      .all(),

    db.orm.public.FamilyMember.where((m) => m.deletedAt.isNull())
      .where({ rsvpStatus: RsvpStatus.CONFIRMED })
      .include("family", (f) => f.select("side"))
      .select("id", "familyId")
      .all(),

    db.orm.public.Guest.where((g) => g.deletedAt.isNull())
      .select("id", "familyId", "side", "numberAttending", "attendanceStatus")
      .all(),

    activeTickets().select("id", "guestId", "familyId", "numberAllowed", "numberUsed").all(),
  ]);

  const sideBuckets: Record<"bride" | "groom" | "neutral", SideMetrics> = {
    bride: emptySide(),
    groom: emptySide(),
    neutral: emptySide(),
  };

  for (const row of familiesBySide) {
    const key = bucketSide(String(row.side));
    sideBuckets[key].families += num(row.families);
  }

  let confirmed = 0;
  let notComing = 0;
  let pending = 0;
  let maybe = 0;

  for (const row of guestRsvpBySide) {
    const key = bucketSide(String(row.side));
    const count = num(row.count);
    const status = String(row.rsvpStatus);
    if (status === RsvpStatus.CONFIRMED) {
      confirmed += count;
      sideBuckets[key].coming += count;
      sideBuckets[key].expectedDinner += count;
    } else if (status === RsvpStatus.DECLINED) {
      notComing += count;
      sideBuckets[key].notComing += count;
    } else if (status === RsvpStatus.MAYBE) {
      maybe += count;
      sideBuckets[key].pending += count;
    } else {
      pending += count;
      sideBuckets[key].pending += count;
    }
  }

  const guestsWithOwnTicket = new Set(
    leanTickets.map((t) => t.guestId).filter((id): id is string => Boolean(id)),
  );
  const familiesWithTicket = new Set(
    leanTickets.map((t) => t.familyId).filter((id): id is string => Boolean(id)),
  );

  // Unique guest rows only — never inflate from ticket seats / numberAttending / joins.
  let totalInvited = 0;
  let withTickets = 0;
  let withoutTickets = 0;
  let arrived = 0;

  for (const guest of leanGuests) {
    const hasOwn = guestsWithOwnTicket.has(guest.id);
    const hasFamily =
      guest.familyId != null && familiesWithTicket.has(guest.familyId);
    const hasTicket = hasOwn || hasFamily;
    const key = bucketSide(String(guest.side));

    totalInvited += 1;
    sideBuckets[key].invited += 1;

    if (hasTicket) {
      withTickets += 1;
      sideBuckets[key].withTickets += 1;
    } else {
      withoutTickets += 1;
      sideBuckets[key].withoutTickets += 1;
    }

    if (guest.attendanceStatus === AttendanceStatus.ARRIVED) {
      arrived += 1;
      sideBuckets[key].arrived += 1;
    }
  }

  let confirmedSpouses = 0;
  for (const spouse of confirmedSpousesByGuestSide) {
    confirmedSpouses += 1;
    const key = bucketSide(String(spouse.guest?.side ?? Side.NEUTRAL));
    sideBuckets[key].expectedDinner += 1;
  }

  let confirmedFamilyMembers = 0;
  for (const member of confirmedMembersByFamilySide) {
    confirmedFamilyMembers += 1;
    const key = bucketSide(String(member.family?.side ?? Side.NEUTRAL));
    sideBuckets[key].expectedDinner += 1;
  }

  const expectedDinner =
    confirmed + confirmedSpouses + confirmedFamilyMembers;

  const summary: DashboardSummary = {
    totalFamilies: familiesBySide.reduce((s, r) => s + num(r.families), 0),
    totalInvited,
    withTickets,
    withoutTickets,
    confirmed,
    notComing,
    pending,
    maybe,
    expectedDinner,
    confirmedSpouses,
    confirmedFamilyMembers,
    arrived,
    unarrived: Math.max(0, totalInvited - arrived),
    arrivalRatePercent:
      totalInvited > 0 ? Math.round((arrived / totalInvited) * 1000) / 10 : 0,
    generatedAt: new Date().toISOString(),
  };

  const matrix: BrideGroomMatrix = {
    bride: sideBuckets.bride,
    groom: sideBuckets.groom,
    neutral: sideBuckets.neutral,
    total: addMetrics(addMetrics(sideBuckets.bride, sideBuckets.groom), sideBuckets.neutral),
  };

  const recentGuests = await db.orm.public.Guest
    .where({ attendanceStatus: AttendanceStatus.ARRIVED })
    .where((g) => g.deletedAt.isNull())
    .include("family", (f) => f.select("familyName"))
    .orderBy((g) => g.checkedInAt.desc())
    .all();

  const recentCheckIns: CheckInEntry[] = recentGuests.map((g) => ({
    id: g.id,
    guestName: g.fullName,
    familyName: g.family?.familyName ?? null,
    side: g.side === Side.BRIDE ? "Bride" : g.side === Side.GROOM ? "Groom" : "General",
    category: g.category ?? null,
    familyStatus: g.familyStatus ?? null,
    numberAllowed: g.numberAttending ?? 1,
    time: g.checkedInAt ? g.checkedInAt.toString() : new Date().toISOString(),
  }));

  return { summary, matrix, recentCheckIns };
}

function ticketForGuest(
  guest: Loaded["guests"][number],
  ticketsByGuest: Map<string, Loaded["tickets"][number]>,
  ticketsByFamily: Map<string, Loaded["tickets"][number][]>,
): Loaded["tickets"][number] | null {
  const direct = ticketsByGuest.get(guest.id);
  if (direct) return direct;
  if (guest.familyId) {
    const fam = ticketsByFamily.get(guest.familyId);
    return fam?.[0] ?? null;
  }
  return null;
}

export async function getGuestReportRows(filter?: {
  dinnerOnly?: boolean;
  notAttending?: boolean;
  pendingOnly?: boolean;
  side?: SideType;
}): Promise<GuestReportRow[]> {
  const data = await loadActiveDataset();
  const ticketsByGuest = new Map(
    data.tickets.filter((t) => t.guestId).map((t) => [t.guestId as string, t]),
  );
  const ticketsByFamily = new Map<string, Loaded["tickets"][number][]>();
  for (const t of data.tickets) {
    if (!t.familyId) continue;
    const list = ticketsByFamily.get(t.familyId) ?? [];
    list.push(t);
    ticketsByFamily.set(t.familyId, list);
  }
  const spousesByGuest = new Map(data.spouses.map((s) => [s.guestId, s]));
  const familiesById = new Map(data.families.map((f) => [f.id, f]));

  const rows: GuestReportRow[] = [];
  for (const guest of data.guests) {
    if (filter?.side && guest.side !== filter.side) continue;
    if (filter?.dinnerOnly && guest.rsvpStatus !== RsvpStatus.CONFIRMED) continue;
    if (filter?.notAttending && guest.rsvpStatus !== RsvpStatus.DECLINED) continue;
    if (
      filter?.pendingOnly &&
      guest.rsvpStatus !== RsvpStatus.PENDING &&
      guest.rsvpStatus !== RsvpStatus.MAYBE
    ) {
      continue;
    }

    const ticket = ticketForGuest(guest, ticketsByGuest, ticketsByFamily);
    const spouse = spousesByGuest.get(guest.id);
    const family = guest.familyId ? familiesById.get(guest.familyId) : null;

    rows.push({
      guestId: guest.id,
      fullName: guest.fullName,
      phone: guest.phone,
      email: guest.email,
      familyName: family?.familyName ?? null,
      category: guest.category,
      cardStatus: guest.cardStatus?.trim() || "",
      side: guest.side as SideType,
      rsvpStatus: guest.rsvpStatus as RsvpStatusType,
      attendanceStatus: guest.attendanceStatus,
      numberAttending: guest.numberAttending,
      ticketNumber: ticket?.ticketNumber ?? null,
      numberAllowed: ticket?.numberAllowed ?? null,
      numberUsed: ticket?.numberUsed ?? null,
      hasTicket: Boolean(ticket),
      spouseName: spouse?.name ?? null,
      spouseRsvp: (spouse?.rsvpStatus as RsvpStatusType) ?? null,
      specialNotes: guest.specialNotes,
      familyStatus: guest.familyStatus,
    });
  }

  return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function getFamilyReportRows(): Promise<FamilyReportRow[]> {
  const data = await loadActiveDataset();
  const ticketsByFamily = new Map<string, Loaded["tickets"][number][]>();
  for (const t of data.tickets) {
    if (!t.familyId) continue;
    const list = ticketsByFamily.get(t.familyId) ?? [];
    list.push(t);
    ticketsByFamily.set(t.familyId, list);
  }
  const guestsByFamily = new Map<string, Loaded["guests"]>();
  for (const g of data.guests) {
    if (!g.familyId) continue;
    const list = guestsByFamily.get(g.familyId) ?? [];
    list.push(g);
    guestsByFamily.set(g.familyId, list);
  }
  const membersByFamily = new Map<string, Loaded["members"]>();
  for (const m of data.members) {
    const list = membersByFamily.get(m.familyId) ?? [];
    list.push(m);
    membersByFamily.set(m.familyId, list);
  }
  const spousesByGuest = new Map(data.spouses.map((s) => [s.guestId, s]));
  const guestTickets = new Map(
    data.tickets.filter((t) => t.guestId).map((t) => [t.guestId as string, t]),
  );

  const rows: FamilyReportRow[] = [];
  for (const family of data.families) {
    const guests = guestsByFamily.get(family.id) ?? [];
    const members = membersByFamily.get(family.id) ?? [];
    const famTickets = ticketsByFamily.get(family.id) ?? [];
    const ticketNumbers = [
      ...famTickets.map((t) => t.ticketNumber),
      ...guests
        .map((g) => guestTickets.get(g.id)?.ticketNumber)
        .filter((n): n is string => Boolean(n)),
    ];

    let invited =
      famTickets.reduce((s, t) => s + t.numberAllowed, 0) +
      guests.reduce((s, g) => s + (guestTickets.get(g.id)?.numberAllowed ?? 0), 0);
    if (invited === 0) {
      invited = guests.length + members.length;
      for (const g of guests) {
        if (spousesByGuest.has(g.id)) invited += 1;
      }
    }

    let coming = 0;
    let notComing = 0;
    let pending = 0;
    let expectedDinner = 0;

    for (const g of guests) {
      if (g.rsvpStatus === RsvpStatus.CONFIRMED) {
        coming += 1;
        expectedDinner += 1;
      } else if (g.rsvpStatus === RsvpStatus.DECLINED) notComing += 1;
      else pending += 1;

      const spouse = spousesByGuest.get(g.id);
      if (spouse) {
        if (spouse.rsvpStatus === RsvpStatus.CONFIRMED) {
          coming += 1;
          expectedDinner += 1;
        } else if (spouse.rsvpStatus === RsvpStatus.DECLINED) notComing += 1;
        else pending += 1;
      }
    }
    for (const m of members) {
      if (m.rsvpStatus === RsvpStatus.CONFIRMED) {
        coming += 1;
        expectedDinner += 1;
      } else if (m.rsvpStatus === RsvpStatus.DECLINED) notComing += 1;
      else pending += 1;
    }

    rows.push({
      familyId: family.id,
      familyName: family.familyName,
      side: family.side as SideType,
      contactPerson: family.contactPerson,
      phone: family.phone,
      guestCount: guests.length,
      invited,
      coming,
      notComing,
      pending,
      expectedDinner,
      ticketNumbers: [...new Set(ticketNumbers)],
    });
  }

  return rows.sort((a, b) => a.familyName.localeCompare(b.familyName));
}

/** Dinner manifest: confirmed guests + their confirmed spouses + confirmed family members. */
export async function getDinnerManifestRows(): Promise<
  Array<{
    name: string;
    role: "Guest" | "Spouse" | "Family member";
    familyName: string | null;
    side: SideType;
    relationship: string | null;
    ticketNumber: string | null;
  }>
> {
  const data = await loadActiveDataset();
  const familiesById = new Map(data.families.map((f) => [f.id, f]));
  const ticketsByGuest = new Map(
    data.tickets.filter((t) => t.guestId).map((t) => [t.guestId as string, t]),
  );
  const ticketsByFamily = new Map<string, Loaded["tickets"][number][]>();
  for (const t of data.tickets) {
    if (!t.familyId) continue;
    const list = ticketsByFamily.get(t.familyId) ?? [];
    list.push(t);
    ticketsByFamily.set(t.familyId, list);
  }
  const spousesByGuest = new Map(data.spouses.map((s) => [s.guestId, s]));

  const rows: Array<{
    name: string;
    role: "Guest" | "Spouse" | "Family member";
    familyName: string | null;
    side: SideType;
    relationship: string | null;
    ticketNumber: string | null;
  }> = [];

  for (const guest of data.guests) {
    if (guest.rsvpStatus !== RsvpStatus.CONFIRMED) continue;
    const family = guest.familyId ? familiesById.get(guest.familyId) : null;
    const ticket = ticketForGuest(guest, ticketsByGuest, ticketsByFamily);
    rows.push({
      name: guest.fullName,
      role: "Guest",
      familyName: family?.familyName ?? null,
      side: guest.side as SideType,
      relationship: "Main guest",
      ticketNumber: ticket?.ticketNumber ?? null,
    });

    const spouse = spousesByGuest.get(guest.id);
    if (spouse && spouse.rsvpStatus === RsvpStatus.CONFIRMED) {
      rows.push({
        name: spouse.name,
        role: "Spouse",
        familyName: family?.familyName ?? null,
        side: guest.side as SideType,
        relationship: "Spouse",
        ticketNumber: ticket?.ticketNumber ?? null,
      });
    }
  }

  for (const member of data.members) {
    if (member.rsvpStatus !== RsvpStatus.CONFIRMED) continue;
    const family = familiesById.get(member.familyId);
    const famTickets = ticketsByFamily.get(member.familyId) ?? [];
    rows.push({
      name: member.name,
      role: "Family member",
      familyName: family?.familyName ?? null,
      side: (family?.side as SideType) ?? Side.NEUTRAL,
      relationship: member.relationship,
      ticketNumber: famTickets[0]?.ticketNumber ?? null,
    });
  }

  return rows.sort((a, b) => {
    const fam = (a.familyName ?? "").localeCompare(b.familyName ?? "");
    if (fam !== 0) return fam;
    return a.name.localeCompare(b.name);
  });
}
