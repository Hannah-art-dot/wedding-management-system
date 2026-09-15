"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import { Check, Loader2, Search, Ticket, TicketX, Trash2 } from "lucide-react";
import type { CheckInSearchResult } from "@/services/check-in";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { canManageGuests, type SessionUser } from "@/lib/auth-shared";
import { CardStatus } from "@/lib/enums";
import { cn } from "@/lib/utils";

type Banner =
  | { kind: "success" | "warning" | "destructive"; text: string }
  | null;

const SIDE_LABEL: Record<string, string> = {
  BRIDE: "BRIDE",
  GROOM: "GROOM",
  NEUTRAL: "NEUTRAL",
};

export function CheckInClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CheckInSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [cardStepGuestId, setCardStepGuestId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CheckInSearchResult | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const isAdmin = user ? canManageGuests(user.role) : false;

  useEffect(() => {
    inputRef.current?.focus();
    void fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  async function searchNow(q: string) {
    const id = ++requestId.current;
    const trimmed = q.trim();

    abortRef.current?.abort();

    if (trimmed.length < 1) {
      startTransition(() => {
        setResults([]);
        setSearching(false);
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);

    try {
      const res = await fetch(`/api/check-in/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await res.json();
      if (id !== requestId.current) return;

      if (!res.ok || !data.success) {
        setBanner({ kind: "destructive", text: data.error ?? "Search failed." });
        startTransition(() => setResults([]));
        return;
      }

      startTransition(() => {
        setResults(data.results as CheckInSearchResult[]);
        setCardStepGuestId(null);
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (id !== requestId.current) return;
      setBanner({ kind: "destructive", text: "Network error while searching." });
    } finally {
      if (id === requestId.current) setSearching(false);
    }
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setBanner(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();

    // Instant clear when empty.
    if (trimmed.length < 1) {
      abortRef.current?.abort();
      startTransition(() => {
        setResults([]);
        setSearching(false);
      });
      return;
    }

    setSearching(true);
    // Progressive name typing stays snappy; phone/other queries keep a short debounce.
    const isNamePrefix = /^[A-Za-z][A-Za-z\s'\-]*$/.test(trimmed);
    const delay = isNamePrefix ? (trimmed.length <= 2 ? 0 : 100) : 300;
    debounceRef.current = setTimeout(() => {
      void searchNow(value);
    }, delay);
  }

  async function handleCardCheckIn(
    guestId: string,
    cardStatus: typeof CardStatus.WITH_CARD | typeof CardStatus.WITHOUT_CARD,
  ) {
    setCheckingId(guestId);
    setBanner(null);
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, cardStatus, checkedInByUserId: user?.id }),
      });
      const data = await res.json();

      if (data.guest) {
        setResults((prev) =>
          prev.map((r) => (r.guestId === data.guest.guestId ? data.guest : r)),
        );
      }

      if (!res.ok || !data.success) {
        setBanner({
          kind: "warning",
          text: data.message ?? data.error ?? "Could not update check-in.",
        });
        return;
      }

      setCardStepGuestId(null);
      setBanner({ kind: "success", text: data.message });
      inputRef.current?.focus();
      inputRef.current?.select();
    } catch {
      setBanner({ kind: "destructive", text: "Network error during check-in." });
    } finally {
      setCheckingId(null);
    }
  }

  function requestDelete(guest: CheckInSearchResult) {
    setPendingDelete(guest);
  }

  function cancelDelete() {
    if (deletingId) return;
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const guest = pendingDelete;

    setDeletingId(guest.guestId);
    setBanner(null);
    try {
      const res = await fetch(`/api/guests/${guest.guestId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ kind: "destructive", text: data.error ?? "Could not delete guest." });
        return;
      }
      setResults((prev) => prev.filter((r) => r.guestId !== guest.guestId));
      setBanner({ kind: "success", text: data.message ?? "Guest deleted." });
      setPendingDelete(null);
    } catch {
      setBanner({ kind: "destructive", text: "Network error while deleting." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:py-8">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Name or phone"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="h-14 rounded-xl border-stone-200/80 bg-white/90 pl-12 text-lg shadow-sm transition-all duration-200 md:text-lg"
          />
          {searching ? (
            <Loader2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-accent" />
          ) : null}
        </div>

        {banner ? (
          <Alert
            variant={
              banner.kind === "success"
                ? "success"
                : banner.kind === "warning"
                  ? "warning"
                  : "destructive"
            }
          >
            {banner.text}
          </Alert>
        ) : null}
      </div>

      <ul className="flex flex-col gap-3 pb-8">
        {query.trim().length >= 1 && !searching && results.length === 0 ? (
          <li className="rounded-2xl border border-stone-200/80 bg-white/75 px-4 py-8 text-center text-muted-foreground shadow-sm backdrop-blur-sm">
            No guests found
          </li>
        ) : null}
        {results.map((guest) => {
          const busy = checkingId === guest.guestId;
          const deleting = deletingId === guest.guestId;
          const arrived = guest.alreadyCheckedIn;
          return (
            <li key={guest.guestId}>
              <Card
                className={cn(
                  "overflow-hidden",
                  arrived && "border-success/30 bg-[color-mix(in_oklab,var(--success)_6%,var(--card))]",
                )}
              >
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display truncate text-2xl font-semibold tracking-tight">
                        {guest.fullName}
                      </h2>
                      {arrived ? (
                        <Badge variant="success" className="gap-1">
                          <Check className="size-3" />
                          Checked In
                        </Badge>
                      ) : null}
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Family Name</dt>
                        <dd className="font-medium">{guest.familyName?.trim() || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Side</dt>
                        <dd className="font-medium">{SIDE_LABEL[guest.side] ?? guest.side}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Category</dt>
                        <dd className="font-medium">{guest.category?.trim() || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Number Allowed</dt>
                        <dd className="font-medium tabular-nums lining-nums">
                          {guest.numberAllowed}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto">
                    {arrived ? (
                      <Button
                        type="button"
                        size="lg"
                        disabled={busy || deleting}
                        variant="secondary"
                        onClick={() => {
                          setCardStepGuestId(null);
                          void handleCardCheckIn(
                            guest.guestId,
                            guest.cardStatus === CardStatus.WITHOUT_CARD
                              ? CardStatus.WITHOUT_CARD
                              : CardStatus.WITH_CARD,
                          );
                        }}
                        className="h-14 w-full sm:min-w-[10.5rem]"
                      >
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        Undo Check-In
                      </Button>
                    ) : cardStepGuestId === guest.guestId ? (
                      <>
                        <p className="text-center text-sm text-muted-foreground sm:text-left">
                          Select card status
                        </p>
                        <Button
                          type="button"
                          size="lg"
                          disabled={busy || deleting}
                          variant="champagne"
                          onClick={() =>
                            void handleCardCheckIn(guest.guestId, CardStatus.WITH_CARD)
                          }
                          className="h-12 w-full border-stone-200 sm:min-w-[10.5rem]"
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Ticket className="size-4" />
                          )}
                          With Card
                        </Button>
                        <Button
                          type="button"
                          size="lg"
                          variant="outline"
                          disabled={busy || deleting}
                          className="h-12 w-full border-stone-200 bg-white/80 sm:min-w-[10.5rem]"
                          onClick={() =>
                            void handleCardCheckIn(guest.guestId, CardStatus.WITHOUT_CARD)
                          }
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <TicketX className="size-4" />
                          )}
                          Without Card
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy || deleting}
                          className="text-muted-foreground"
                          onClick={() => setCardStepGuestId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="lg"
                        disabled={busy || deleting}
                        variant="champagne"
                        onClick={() => setCardStepGuestId(guest.guestId)}
                        className="h-14 w-full sm:min-w-[10.5rem]"
                      >
                        <Check className="size-4" />
                        Check-In
                      </Button>
                    )}
                    {isAdmin ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={deleting || busy}
                        className="text-destructive"
                        onClick={() => requestDelete(guest)}
                      >
                        {deleting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Delete Guest
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-guest-title"
          onClick={cancelDelete}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancelDelete();
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-stone-200/60 bg-white/90 p-5 shadow-xl backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="delete-guest-title" className="font-display text-xl font-semibold tracking-tight">
              Are you sure you want to delete this guest?
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{pendingDelete.fullName}</p>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={Boolean(deletingId)}
                onClick={cancelDelete}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="champagne"
                className="flex-1"
                disabled={Boolean(deletingId)}
                onClick={() => void confirmDelete()}
              >
                {deletingId ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
