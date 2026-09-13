"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { BackButton } from "@/components/layout/back-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Side } from "@/lib/enums";
import { CATEGORY_LABELS } from "@/lib/simple-guest";

async function fetchNextTicket(): Promise<string | null> {
  try {
    const res = await fetch("/api/guests/next-ticket");
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ticketNumber ?? null;
  } catch {
    return null;
  }
}

export function GuestRegistrationForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [side, setSide] = useState<"BRIDE" | "GROOM">(Side.BRIDE);
  const [category, setCategory] =
    useState<keyof typeof CATEGORY_LABELS>("BRIDES_FAMILY");
  const [ticketNumber, setTicketNumber] = useState("T-00001");
  const [numberAllowed, setNumberAllowed] = useState("1");
  const [rsvpStatus, setRsvpStatus] = useState("PENDING");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    void fetchNextTicket().then((ticket) => {
      if (ticket) setTicketNumber(ticket);
    });
  }, []);

  useEffect(() => {
    if (!familyName && fullName) setFamilyName(fullName);
  }, [fullName, familyName]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          familyName: familyName || fullName,
          side,
          category,
          ticketNumber,
          numberAllowed: Number(numberAllowed) || 1,
          rsvpStatus,
          phone,
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not save guest.");
        return;
      }
      setFullName("");
      setFamilyName("");
      setSide(Side.BRIDE);
      setCategory("BRIDES_FAMILY");
      setNumberAllowed("1");
      setRsvpStatus("PENDING");
      setPhone("");
      setEmail("");
      setSaved(true);
      const next = await fetchNextTicket();
      if (next) setTicketNumber(next);
    } catch {
      setError("Network error while saving.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-10">
      <div className="mb-6">
        <BackButton href="/" />
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white/75 p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div className="space-y-1.5">
          <Label htmlFor="fullName">FullName</Label>
          <Input
            id="fullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="familyName">FamilyName</Label>
          <Input
            id="familyName"
            required
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="side">Side</Label>
          <Select
            id="side"
            value={side}
            onChange={(e) => setSide(e.target.value as "BRIDE" | "GROOM")}
          >
            <option value={Side.BRIDE}>BRIDE</option>
            <option value={Side.GROOM}>GROOM</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as keyof typeof CATEGORY_LABELS)
            }
          >
            {Object.keys(CATEGORY_LABELS).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ticketNumber">TicketNumber</Label>
          <Input
            id="ticketNumber"
            required
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="numberAllowed">NumberAllowed</Label>
          <Input
            id="numberAllowed"
            type="number"
            min={1}
            required
            value={numberAllowed}
            onChange={(e) => setNumberAllowed(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rsvpStatus">RSVPStatus</Label>
          <Select
            id="rsvpStatus"
            value={rsvpStatus}
            onChange={(e) => setRsvpStatus(e.target.value)}
          >
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="NOT_COMING">NOT_COMING</option>
            <option value="PENDING">PENDING</option>
            <option value="MAYBE">MAYBE</option>
          </Select>
        </div>

        <div className="space-y-1.5 border-t border-border/70 pt-4">
          <Label htmlFor="phone">
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Contact phone number"
            className="h-12"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="h-12"
          />
        </div>

        {error ? <Alert variant="destructive">{error}</Alert> : null}
        {saved ? <Alert>Guest saved.</Alert> : null}

        <Button type="submit" size="lg" variant="champagne" disabled={busy} className="w-full">
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>

        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href="/guests/import">Import CSV / Excel</Link>
        </Button>
      </form>
      </div>
    </div>
  );
}
