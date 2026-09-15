"use client";

import { useEffect, useState } from "react";
import type { BrideGroomMatrix, DashboardSummary } from "@/services/analytics";
import { formatCount } from "@/lib/utils";

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/75 px-4 py-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-soft">
      <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">{label}</p>
      <p className="mt-3 font-serif text-4xl font-semibold tracking-tight text-stone-800 tabular-nums lining-nums">
        {typeof value === "number" ? formatCount(value) : value}
        {suffix ? (
          <span className="ml-1 text-2xl font-medium text-stone-500">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
}

export function AdminDashboard({
  summary: initialSummary,
  matrix: initialMatrix,
}: {
  summary: DashboardSummary;
  matrix: BrideGroomMatrix;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [matrix, setMatrix] = useState(initialMatrix);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok && data.success && data.summary && data.matrix) {
          setSummary(data.summary);
          setMatrix(data.matrix);
        }
      } catch {
        /* keep last good snapshot */
      }
    }

    const id = setInterval(() => void refresh(), 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="animate-fade-up space-y-1">
          <p className="text-xs font-medium tracking-[0.28em] text-stone-500 uppercase">Overview</p>
          <h1 className="font-serif text-3xl font-semibold tracking-wide text-stone-800 sm:text-4xl">
            Wedding Desk
          </h1>
        </header>

        <section className="animate-fade-up animate-delay-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Arrived" value={summary.arrived} />
          <Stat label="Unarrived Guests" value={summary.unarrived} />
          <Stat label="Total Invited" value={summary.totalInvited} />
          <Stat
            label="Arrival Rate"
            value={summary.arrivalRatePercent}
            suffix="%"
          />
        </section>

        <section className="animate-fade-up animate-delay-2 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200/80 bg-white/75 px-4 py-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-soft">
            <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">
              Bride&apos;s Side
            </p>
            <p className="mt-3 font-serif text-3xl font-semibold text-stone-800 tabular-nums lining-nums">
              {formatCount(matrix.bride.arrived)}
              <span className="text-lg font-normal text-stone-500"> checked in</span>
            </p>
            <p className="mt-1 text-sm text-stone-500 tabular-nums lining-nums">
              {formatCount(matrix.bride.invited)} invited
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white/75 px-4 py-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-soft">
            <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">
              Groom&apos;s Side
            </p>
            <p className="mt-3 font-serif text-3xl font-semibold text-stone-800 tabular-nums lining-nums">
              {formatCount(matrix.groom.arrived)}
              <span className="text-lg font-normal text-stone-500"> checked in</span>
            </p>
            <p className="mt-1 text-sm text-stone-500 tabular-nums lining-nums">
              {formatCount(matrix.groom.invited)} invited
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
