"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Search } from "lucide-react";
import type { CheckInSearchResult } from "@/services/check-in";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const SIDE_LABEL: Record<string, string> = {
  BRIDE: "Bride’s side",
  GROOM: "Groom’s side",
  NEUTRAL: "Neutral",
};

const RSVP_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  MAYBE: "Maybe",
};

type SideFilter = "ALL" | "BRIDE" | "GROOM" | "NEUTRAL";

export function GuestDirectory() {
  const [query, setQuery] = useState("");
  const [side, setSide] = useState<SideFilter>("ALL");
  const [results, setResults] = useState<CheckInSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Search to browse the guest list");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function searchNow(q: string) {
    const id = ++requestId.current;
    const trimmed = q.trim();

    if (trimmed.length < 2) {
      startTransition(() => {
        setResults([]);
        setSearching(false);
        setStatusText(
          trimmed.length > 0 ? "Type at least 2 characters" : "Search to browse the guest list",
        );
      });
      return;
    }

    setSearching(true);
    setStatusText("Searching…");
    setError(null);

    try {
      const res = await fetch(`/api/check-in/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (id !== requestId.current) return;

      if (!res.ok || !data.success) {
        setError(data.error ?? "Search failed.");
        startTransition(() => {
          setResults([]);
          setStatusText("Search failed");
        });
        return;
      }

      const next = data.results as CheckInSearchResult[];
      startTransition(() => {
        setResults(next);
        setStatusText(
          next.length > 0
            ? `${next.length} guest${next.length === 1 ? "" : "s"}`
            : "No guests found",
        );
      });
    } catch {
      if (id !== requestId.current) return;
      setError("Network error while searching.");
      setStatusText("Search failed");
    } finally {
      if (id === requestId.current) setSearching(false);
    }
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchNow(value);
    }, 280);
  }

  const filtered =
    side === "ALL" ? results : results.filter((guest) => guest.side === side);

  const filters: { id: SideFilter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "BRIDE", label: "Bride" },
    { id: "GROOM", label: "Groom" },
    { id: "NEUTRAL", label: "Neutral" },
  ];

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

      <div className="animate-fade-up animate-delay-1 sticky top-[3.75rem] z-30 space-y-3 rounded-xl border border-border/70 bg-card/90 p-4 shadow-soft backdrop-blur-md sm:top-[4.25rem] sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Search name, phone, family, ticket…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="h-12 rounded-xl bg-background/80 pl-10"
          />
          {searching ? (
            <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-accent" />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by side">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={side === filter.id ? "champagne" : "outline"}
              onClick={() => setSide(filter.id)}
              className="rounded-full"
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {searching ? "Searching…" : statusText}
          {side !== "ALL" && results.length > 0
            ? ` · showing ${filtered.length} on this side`
            : null}
        </p>

        {error ? <Alert variant="destructive">{error}</Alert> : null}
      </div>

      <ul className="grid gap-3 pb-10 sm:grid-cols-2">
        {filtered.map((guest, index) => (
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
                    {guest.familyName ?? "No family"} · {SIDE_LABEL[guest.side] ?? guest.side}
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Badge variant="champagne">
                    {RSVP_LABEL[guest.rsvpStatus] ?? guest.rsvpStatus}
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

      {!searching && query.trim().length >= 2 && filtered.length === 0 ? (
        <p className="pb-10 text-center text-sm text-muted-foreground">
          No guests match this search
          {side !== "ALL" ? " and side filter" : ""}.
        </p>
      ) : null}
    </div>
  );
}
