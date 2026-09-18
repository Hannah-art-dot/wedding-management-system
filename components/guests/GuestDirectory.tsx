import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GuestSearchControls } from "./GuestSearchControls";
import { SIDE_LABELS, type Side } from "@/lib/enums";
import { RSVP_LABELS, type RsvpStatus } from "@/lib/enums";
import type { CheckInSearchResult } from "@/services/check-in";

interface GuestDirectoryProps {
  results: CheckInSearchResult[];
  query: string;
  side: string;
}

export function GuestDirectory({ results, query, side }: GuestDirectoryProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:py-10">
      <header className="animate-fade-up flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Directory</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Guests
          </h1>
          <p className="max-w-xl text-base text-muted-foreground text-pretty">
            Look up arrivals, seats, and RSVP status. Jump to check-in when someone is at the
            gate.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild variant="champagne" className="mt-2 w-full sm:mt-0 sm:w-auto">
            <Link href="/guests">Register guest</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/guests/import">Import CSV / Excel</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/families">Families</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/check-in">
              Gate check-in
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <GuestSearchControls />

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {query.length >= 2 ? `Search results for "${query}"` : "Search to browse the guest list"}
        {side !== "ALL" && results.length > 0 ? ` · showing ${results.length} on this side` : null}
      </p>

      <ul className="grid gap-3 pb-10 sm:grid-cols-2">
        {results.map((guest, index) => (
          <li
            key={guest.guestId}
            className="animate-fade-up"
            style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
          >
            <Card className="h-full transition-colors hover:border-accent/60">
              <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                      {guest.fullName}
                    </h2>
                    {guest.alreadyCheckedIn ? (
                      <Badge variant="success">Arrived</Badge>
                    ) : (
                      <Badge variant="muted">Not arrived</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {guest.familyName ?? "No family"} · {SIDE_LABELS[guest.side as Side] ?? guest.side}
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Badge variant="champagne">
                    {RSVP_LABELS[guest.rsvpStatus as RsvpStatus] ?? guest.rsvpStatus}
                  </Badge>
                  {guest.ticketNumber ? (
                    <Badge variant="outline">{guest.ticketNumber}</Badge>
                  ) : (
                    <Badge variant="secondary">No ticket</Badge>
                  )}
                  <Badge variant="secondary">
                    {guest.numberUsed}/{guest.numberAllowed}
                  </Badge>
                </div>

                {guest.phone ? (
                  <p className="text-xs tracking-wide text-muted-foreground">{guest.phone}</p>
                ) : null}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {query.trim().length >= 2 && results.length === 0 ? (
        <p className="pb-10 text-center text-sm text-muted-foreground">
          No guests match this search
          {side !== "ALL" ? " and side filter" : ""}.
        </p>
      ) : null}
    </div>
  );
}
