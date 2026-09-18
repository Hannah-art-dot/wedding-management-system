import React from "react";
import { db } from "@/lib/db";
import { RosterView, type RosterGuest, type RosterGroup } from "@/components/reports/RosterView";
import { Side } from "@/lib/enums";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const sideFilter = typeof params.side === "string" ? params.side : "ALL";

  // Base query: all non-deleted guests
  let query = db.orm.public.Guest
    .where((g) => g.deletedAt.isNull())
    .include('family', (f) => f)
    .include('spouse', (s) => s);

  // Apply side filter if not ALL
  if (sideFilter === Side.BRIDE) {
    query = query.where((g) => g.side.eq(Side.BRIDE));
  } else if (sideFilter === Side.GROOM) {
    query = query.where((g) => g.side.eq(Side.GROOM));
  }

  // Fetch from DB
  const rawGuests = await query.all();

  // Transform to view model
  const guests: RosterGuest[] = rawGuests.map((g) => {
    return {
      id: g.id,
      fullName: g.fullName || "Unnamed Guest",
      familyName: g.family?.familyName ?? "None",
      side: g.side,
      category: g.category ?? "",
      familyStatus: g.familyStatus ?? (g.family ? "Family" : "Individual"),
      numberAllowed: g.numberAttending ?? (g.spouse ? 2 : 1),
    };
  });

  // Sort alphabetically by fullName (safe fallback for empty names)
  guests.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));

  // Group by first letter
  const groupedMap = new Map<string, RosterGuest[]>();
  for (const guest of guests) {
    const initial = (guest.fullName?.trim()?.[0] || '#').toUpperCase();
    const letter = /[A-Z]/.test(initial) ? initial : "#";
    
    if (!groupedMap.has(letter)) {
      groupedMap.set(letter, []);
    }
    groupedMap.get(letter)!.push(guest);
  }

  // Convert map to sorted array of groups
  const groups: RosterGroup[] = Array.from(groupedMap.entries())
    .map(([letter, guests]) => ({ letter, guests }))
    .sort((a, b) => a.letter.localeCompare(b.letter));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 print:p-0 print:m-0 print:max-w-none">
      <RosterView groups={groups} />
    </div>
  );
}
