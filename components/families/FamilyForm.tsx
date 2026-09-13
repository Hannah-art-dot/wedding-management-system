"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SIDE_LABELS, Side } from "@/lib/enums";

export function FamilyForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [side, setSide] = useState<Side>(Side.BRIDE);
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyName, side, contactPerson, phone, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not create family.");
        return;
      }
      router.push(`/families/${data.familyId}`);
      router.refresh();
    } catch {
      setError("Network error while saving.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-8 space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
          Family management
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">New family</h1>
        <p className="text-muted-foreground">
          SRS §6 — family name, primary contact, phone, and side.
        </p>
      </header>

      <Card className="border-border/80 bg-card/95">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Family details</CardTitle>
          <CardDescription>Link guests afterward from guest registration.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-1.5">
              <Label htmlFor="familyName">Family name</Label>
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
              <Select id="side" value={side} onChange={(e) => setSide(e.target.value as Side)}>
                {Object.entries(SIDE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">Primary contact person</Label>
              <Input
                id="contact"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Contact phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {error ? <Alert variant="destructive">{error}</Alert> : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push("/families")}>
                Cancel
              </Button>
              <Button type="submit" variant="champagne" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Create family"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
