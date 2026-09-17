"use client";

import { useRef, useTransition, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GuestSearchControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = searchParams.get("q") || "";
  const side = searchParams.get("side") || "ALL";

  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  function updateParams(newQ: string, newSide: string) {
    const params = new URLSearchParams();
    if (newQ.trim().length >= 2) {
      params.set("q", newQ.trim());
    }
    if (newSide !== "ALL") {
      params.set("side", newSide);
    }
    
    startTransition(() => {
      router.replace(`/guests?${params.toString()}`);
    });
  }

  function onQueryChange(value: string) {
    setLocalQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      updateParams(value, side);
    }, 280);
  }

  function onSideChange(newSide: string) {
    updateParams(localQuery, newSide);
  }

  const filters = [
    { id: "ALL", label: "All" },
    { id: "BRIDE", label: "Bride" },
    { id: "GROOM", label: "Groom" },
    { id: "NEUTRAL", label: "Neutral" },
  ];

  return (
    <div className="animate-fade-up animate-delay-1 sticky top-[3.75rem] z-30 space-y-3 rounded-xl border border-border/70 bg-card/90 p-4 shadow-soft backdrop-blur-md sm:top-[4.25rem] sm:p-5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Search name, phone, family, ticket…"
          value={localQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-12 rounded-xl bg-background/80 pl-10"
        />
        {isPending ? (
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
            onClick={() => onSideChange(filter.id)}
            className="rounded-full"
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
