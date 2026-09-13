"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  AttendanceStatus,
  RSVP_LABELS,
  RsvpStatus,
  SIDE_LABELS,
  TICKET_STATUS_LABELS,
  type Side,
  type TicketStatus,
} from "@/lib/enums";

type FamilyDetailPayload = {
  family: {
    id: string;
    familyName: string;
    side: string;
    contactPerson: string | null;
    phone: string | null;
    notes: string | null;
  };
  guests: Array<{
    id: string;
    fullName: string;
    phone: string | null;
    category: string | null;
    rsvpStatus: string;
    numberAttending: number | null;
  }>;
  spouses: Array<{
    id: string;
    guestId: string;
    name: string;
    rsvpStatus: string;
    ticketStatus: string;
    attendanceStatus: string;
  }>;
  members: Array<{
    id: string;
    name: string;
    relationship: string;
    age: number | null;
    rsvpStatus: string;
    attendanceStatus: string;
  }>;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    numberAllowed: number;
    status: string;
    issueDate: unknown;
  }>;
};

export function FamilyDetail({ familyId }: { familyId: string }) {
  const [data, setData] = useState<FamilyDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [relationship, setRelationship] = useState("Child");
  const [age, setAge] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(RsvpStatus.PENDING);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    void fetch(`/api/families/${familyId}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json.success) throw new Error(json.error ?? "Failed");
        setData(json);
        setError(null);
      })
      .catch(() => setError("Could not load family."))
      .finally(() => setLoading(false));
  }, [familyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addMember(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/families/${familyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: [
            {
              name: memberName,
              relationship,
              age: age === "" ? null : Number(age),
              rsvpStatus,
              attendanceStatus: AttendanceStatus.NOT_ARRIVED,
            },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error ?? "Could not add member.");
        return;
      }
      setMemberName("");
      setAge("");
      setAdding(false);
      load();
    } catch {
      setFormError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 px-4 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading family…
      </p>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-16">
        <Alert variant="destructive">{error ?? "Family not found."}</Alert>
      </div>
    );
  }

  const { family, guests, spouses, members, tickets } = data;
  const partyRsvps = [
    ...guests.map((g) => g.rsvpStatus),
    ...spouses.map((s) => s.rsvpStatus),
    ...members.map((m) => m.rsvpStatus),
  ];
  const confirmed = partyRsvps.filter((r) => r === RsvpStatus.CONFIRMED).length;
  const declined = partyRsvps.filter((r) => r === RsvpStatus.DECLINED).length;
  const pending = partyRsvps.filter(
    (r) => r === RsvpStatus.PENDING || r === RsvpStatus.MAYBE,
  ).length;
  const invited = tickets.reduce((s, t) => s + t.numberAllowed, 0) || partyRsvps.length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:py-12">
      <header className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Family</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {family.familyName}
        </h1>
        <p className="text-muted-foreground">
          {SIDE_LABELS[family.side as Side] ?? family.side}
          {family.contactPerson ? ` · Contact: ${family.contactPerson}` : ""}
          {family.phone ? ` · ${family.phone}` : ""}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="outline">Invited {invited}</Badge>
          <Badge variant="champagne">Confirmed {confirmed}</Badge>
          <Badge variant="muted">Pending {pending}</Badge>
          <Badge variant="secondary">Not attending {declined}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 pt-3">
          <Button asChild size="sm" variant="champagne">
            <Link href="/guests">Add guest to family</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/families">All families</Link>
          </Button>
        </div>
      </header>

      {family.notes ? (
        <Alert variant="default">
          <span className="font-medium">Notes: </span>
          {family.notes}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Guests</CardTitle>
          <CardDescription>Main guests linked to this family</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guests linked yet.</p>
          ) : (
            guests.map((g) => {
              const spouse = spouses.find((s) => s.guestId === g.id);
              return (
                <div
                  key={g.id}
                  className="rounded-xl border border-border/70 bg-background/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-xl font-semibold">{g.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {g.category ?? "Uncategorized"}
                        {g.phone ? ` · ${g.phone}` : ""}
                      </p>
                    </div>
                    <Badge variant="champagne">
                      {RSVP_LABELS[g.rsvpStatus as RsvpStatus] ?? g.rsvpStatus}
                    </Badge>
                  </div>
                  {g.numberAttending != null ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Number attending: {g.numberAttending}
                    </p>
                  ) : null}
                  {spouse ? (
                    <p className="mt-2 text-sm">
                      Spouse: <span className="font-medium">{spouse.name}</span> ·{" "}
                      {RSVP_LABELS[spouse.rsvpStatus as RsvpStatus] ?? spouse.rsvpStatus} ·
                      Ticket{" "}
                      {TICKET_STATUS_LABELS[spouse.ticketStatus as TicketStatus] ??
                        spouse.ticketStatus}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-2xl">Family members</CardTitle>
            <CardDescription>Children and other household members</CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
            <Plus className="size-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {adding ? (
            <form
              className="grid gap-3 rounded-xl border border-border/70 p-4 sm:grid-cols-2"
              onSubmit={(e) => void addMember(e)}
            >
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input required value={memberName} onChange={(e) => setMemberName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Relationship</Label>
                <Input
                  required
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Age</Label>
                <Input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>RSVP</Label>
                <Select
                  value={rsvpStatus}
                  onChange={(e) => setRsvpStatus(e.target.value as RsvpStatus)}
                >
                  {Object.entries(RSVP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              {formError ? (
                <div className="sm:col-span-2">
                  <Alert variant="destructive">{formError}</Alert>
                </div>
              ) : null}
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="champagne" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Save member"}
                </Button>
              </div>
            </form>
          ) : null}

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No family members yet.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.relationship}
                      {m.age != null ? ` · age ${m.age}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {RSVP_LABELS[m.rsvpStatus as RsvpStatus] ?? m.rsvpStatus}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Tickets</CardTitle>
          <CardDescription>Invitation numbers for this family unit</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets assigned.</p>
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <span className="font-medium">{t.ticketNumber}</span>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{t.numberAllowed} allowed</Badge>
                    <Badge variant="champagne">
                      {TICKET_STATUS_LABELS[t.status as TicketStatus] ?? t.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
