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
import { Side, CardStatus } from "@/lib/enums";
import {
  PRE_INVITED_CATEGORIES,
  CARD_STATUS_VALUES,
  type PreInvitedCategory,
  type CardStatusValue,
} from "@/lib/simple-guest";

export function GuestRegistrationForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [side, setSide] = useState<"BRIDE" | "GROOM">(Side.BRIDE);
  const [category, setCategory] = useState<PreInvitedCategory>("Brides_Family");
  const [familyStatus, setFamilyStatus] = useState("Individual");
  const [numberAllowed, setNumberAllowed] = useState("1");
  const [cardStatus, setCardStatus] = useState<CardStatusValue>(CardStatus.WITH_CARD);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => {
      setSaved(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [saved]);

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
          phone,
          familyName,
          side,
          category,
          familyStatus,
          numberAllowed: Number(numberAllowed) || 1,
          cardStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not save guest.");
        return;
      }
      setFullName("");
      setPhone("");
      setFamilyName("");
      setSide(Side.BRIDE);
      setCategory("Brides_Family");
      setFamilyStatus("Individual");
      setNumberAllowed("1");
      setCardStatus(CardStatus.WITH_CARD);
      setSaved(true);
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

      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-7">
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-1.5">
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
            <Label htmlFor="familyName">
              Family Name{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="familyName"
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
              onChange={(e) => setCategory(e.target.value as PreInvitedCategory)}
            >
              {PRE_INVITED_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="familyStatus">Family Status</Label>
            <Select
              id="familyStatus"
              value={familyStatus}
              onChange={(e) => setFamilyStatus(e.target.value)}
            >
              <option value="Individual">Individual</option>
              <option value="Spouse">Spouse</option>
              <option value="Family">Family</option>
              <option value="Group">Group</option>
            </Select>
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
            <Label htmlFor="cardStatus">Card Status</Label>
            <Select
              id="cardStatus"
              value={cardStatus}
              onChange={(e) => setCardStatus(e.target.value as CardStatusValue)}
            >
              {CARD_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>

          {error ? <Alert variant="destructive">{error}</Alert> : null}
          {saved ? (
            <div
              role="status"
              className="animate-fade-in inline-flex w-fit max-w-full items-center gap-2 rounded-lg border border-[#e7e0d6]/90 bg-[#f7f3ec] px-3 py-1.5 text-xs leading-snug text-stone-700"
            >
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-[#7a9a86]"
              />
              <p className="font-medium text-stone-700">
                Guest saved successfully!
              </p>
            </div>
          ) : null}

          <Button type="submit" size="lg" disabled={busy} className="w-full rounded-md bg-[#bfa07a] text-white hover:bg-[#a88a65]">
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>

          <Button asChild size="lg" variant="outline" className="w-full bg-white border border-stone-200 hover:bg-stone-50">
            <Link href="/guests/import">Import CSV / Excel</Link>
          </Button>
        </form>
      </div>
    </div>
  );
}
