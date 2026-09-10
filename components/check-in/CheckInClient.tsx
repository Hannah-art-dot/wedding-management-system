"use client";

import { useRef, useState, startTransition, useEffect } from "react";
import type { CheckInSearchResult } from "@/services/check-in";

type Banner =
  | { kind: "success"; text: string }
  | { kind: "warning"; text: string }
  | { kind: "error"; text: string }
  | null;

const SIDE_LABEL: Record<string, string> = {
  BRIDE: "Bride",
  GROOM: "Groom",
  NEUTRAL: "Neutral",
};

const RSVP_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  MAYBE: "Maybe",
};

export function CheckInClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CheckInSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [statusText, setStatusText] = useState("Results appear as you type");
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
          trimmed.length > 0 ? "Type at least 2 characters" : "Results appear as you type",
        );
      });
      return;
    }

    setSearching(true);
    setStatusText("Searching…");

    try {
      const res = await fetch(`/api/check-in/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (id !== requestId.current) return;

      if (!res.ok || !data.success) {
        setBanner({ kind: "error", text: data.error ?? "Search failed." });
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
            ? `${next.length} match${next.length === 1 ? "" : "es"}`
            : "No matches",
        );
      });
    } catch {
      if (id !== requestId.current) return;
      setBanner({ kind: "error", text: "Network error while searching." });
      setStatusText("Search failed");
    } finally {
      if (id === requestId.current) setSearching(false);
    }
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setBanner(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchNow(value);
    }, 280);
  }

  async function handleCheckIn(guestId: string) {
    setCheckingId(guestId);
    setBanner(null);
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      });
      const data = await res.json();

      if (data.guest) {
        setResults((prev) =>
          prev.map((r) => (r.guestId === data.guest.guestId ? data.guest : r)),
        );
      }

      if (res.status === 409 && data.status === "already_checked_in") {
        setBanner({ kind: "warning", text: data.message });
        return;
      }

      if (!res.ok || !data.success) {
        setBanner({
          kind: "warning",
          text: data.message ?? data.error ?? "Could not check in guest.",
        });
        return;
      }

      setBanner({ kind: "success", text: data.message });
      inputRef.current?.focus();
      inputRef.current?.select();
    } catch {
      setBanner({ kind: "error", text: "Network error during check-in." });
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-emerald-800 uppercase">
          Venue gate
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Guest check-in
        </h1>
        <p className="max-w-xl text-base text-stone-600">
          Search by guest name, phone, family name, or ticket code — then tap Check In. No camera
          or QR codes required.
        </p>
      </header>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-stone-700">Search guests</span>
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Name, phone, or ticket code…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-14 w-full rounded-xl border border-stone-300 bg-white px-4 text-lg text-stone-900 shadow-sm outline-none ring-emerald-700/30 placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4"
        />
        <span className="text-sm text-stone-500">{searching ? "Searching…" : statusText}</span>
      </label>

      {banner ? (
        <div
          role="status"
          className={
            banner.kind === "success"
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
              : banner.kind === "warning"
                ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
                : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900"
          }
        >
          {banner.text}
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {results.map((guest) => {
          const busy = checkingId === guest.guestId;
          const arrived = guest.alreadyCheckedIn;
          return (
            <li
              key={guest.guestId}
              className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="truncate text-xl font-semibold text-stone-900">
                    {guest.fullName}
                  </h2>
                  {arrived ? (
                    <span className="text-sm font-medium text-emerald-700">Arrived</span>
                  ) : null}
                </div>
                <p className="text-sm text-stone-600">
                  {guest.familyName ?? "No family"} · {SIDE_LABEL[guest.side] ?? guest.side}
                </p>
                <p className="text-sm text-stone-600">
                  RSVP: {RSVP_LABEL[guest.rsvpStatus] ?? guest.rsvpStatus}
                  {guest.ticketNumber ? ` · Ticket ${guest.ticketNumber}` : ""}
                  {` · Allowed ${guest.numberAllowed}`}
                  {guest.numberUsed > 0 ? ` · Used ${guest.numberUsed}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy || arrived}
                onClick={() => void handleCheckIn(guest.guestId)}
                className={
                  arrived
                    ? "h-14 shrink-0 rounded-xl bg-stone-200 px-8 text-base font-semibold text-stone-500"
                    : "h-14 shrink-0 rounded-xl bg-emerald-800 px-8 text-base font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60"
                }
              >
                {arrived ? "Checked in" : busy ? "Checking in…" : "Check In"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
