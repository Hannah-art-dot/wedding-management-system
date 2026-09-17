import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { FloralAccent } from "@/components/brand/floral-accent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SIDE_LABELS, type Side } from "@/lib/enums";
import type { FamilySummary } from "@/services/guest-registration";

interface FamilyDirectoryProps {
  families: FamilySummary[];
}

export function FamilyDirectory({ families }: FamilyDirectoryProps) {
  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <FloralAccent className="pointer-events-none absolute top-2 left-0 size-28 opacity-35" />
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
            Households
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Families
          </h1>
          <p className="max-w-xl text-muted-foreground text-pretty">
            Manage family units, contacts, and invited vs confirmed covers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/guests">Register guest</Link>
          </Button>
          <Button asChild variant="champagne">
            <Link href="/families/new">
              <Plus className="size-4" />
              New family
            </Link>
          </Button>
        </div>
      </header>


      {families.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">No families yet.</p>
            <Button asChild variant="champagne">
              <Link href="/families/new">Create the first family</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {families.map((f) => (
          <li key={f.id}>
            <Link href={`/families/${f.id}`} className="block h-full">
              <Card className="h-full transition-colors hover:border-accent/60">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div>
                    <h2 className="font-display text-xl font-semibold">{f.familyName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {SIDE_LABELS[f.side as Side] ?? f.side}
                      {f.contactPerson ? ` · ${f.contactPerson}` : ""}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Badge variant="secondary">{f.guestCount} guests</Badge>
                    <Badge variant="outline">Invited {f.invited}</Badge>
                    <Badge variant="champagne">Confirmed {f.confirmed}</Badge>
                    <Badge variant="muted">Pending {f.pending}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
