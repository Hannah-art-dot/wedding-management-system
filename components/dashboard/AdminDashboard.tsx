"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cell, Pie, PieChart } from "recharts";
import type { BrideGroomMatrix, DashboardSummary, SideMetrics, CheckInEntry } from "@/services/analytics";
import { formatCount } from "@/lib/utils";

const COLORS = {
  white: "#ffffff",
  track: "#efe8df",
  green: "#2e5a43",
  greenLight: "#538d70",
  grey: "#a89f91",
  brideArrived: "#c86d4e",
  bridePending: "#e5b5a7",
  bridePanel: "#ffffff",
  groomArrived: "#c59b27",
  groomPending: "#e6d59e",
  groomPanel: "#ffffff",
} as const;

const PIE_ANIMATION = {
  isAnimationActive: true,
  animationBegin: 80,
  animationDuration: 1200,
  animationEasing: "ease-out" as const,
};

type PieSlice = { key: string; value: number; color: string };



function PieMotionStyles() {
  return (
    <style>{`
      @keyframes pie-breathe {
        0%   { transform: translateY(0)      scale(1); }
        50%  { transform: translateY(-3px)   scale(1.018); }
        100% { transform: translateY(0)      scale(1); }
      }
      @keyframes pie-halo {
        0%   { opacity: 0.18; transform: scale(0.94); }
        50%  { opacity: 0.42; transform: scale(1.04); }
        100% { opacity: 0.18; transform: scale(0.94); }
      }

      .pie-breathe {
        animation: pie-breathe 5.2s ease-in-out infinite;
        transform-origin: 50% 50%;
      }
      .pie-halo {
        animation: pie-halo 5.2s ease-in-out infinite;
        transform-origin: 50% 50%;
      }

      .pie-crisp svg,
      .pie-crisp svg * {
        shape-rendering: geometricPrecision;
        text-rendering: geometricPrecision;
        image-rendering: -webkit-optimize-contrast;
      }
      .pie-crisp svg {
        overflow: visible;
        backface-visibility: hidden;
      }
      .pie-crisp .recharts-sector {
        vector-effect: non-scaling-stroke;
      }

      @media (prefers-reduced-motion: reduce) {
        .pie-breathe,
        .pie-halo {
          animation: none !important;
        }
      }
    `}</style>
  );
}

function FilledPieChart({
  data,
  accent,
  dimension = 150,
  outerRadius = 68,
  paddingAngle = 1.5,
  cornerRadius = 2,
  strokeWidth = 1.5,
  animationDelay = 0,
}: {
  data: PieSlice[];
  accent: string;
  dimension?: number;
  outerRadius?: number;
  paddingAngle?: number;
  cornerRadius?: number;
  strokeWidth?: number;
  animationDelay?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const motionKey = data.map((d) => `${d.key}:${d.value}`).join("|");
  const loopDelay = `-${animationDelay}ms`;

  if (!mounted) {
    return (
      <div
        className="relative mx-auto shrink-0 flex items-center justify-center"
        style={{ width: dimension, height: dimension }}
      >
        <div
          className="pie-halo pointer-events-none absolute inset-0 rounded-full"
          style={{
            animationDelay: loopDelay,
            background: `radial-gradient(circle, ${accent}00 52%, ${accent}56 72%, ${accent}00 84%)`,
          }}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto shrink-0 flex items-center justify-center"
      style={{ width: dimension, height: dimension }}
    >
      <div
        className="pie-halo pointer-events-none absolute inset-0 rounded-full"
        style={{
          animationDelay: loopDelay,
          background: `radial-gradient(circle, ${accent}00 52%, ${accent}56 72%, ${accent}00 84%)`,
        }}
        aria-hidden
      />

      <div
        key={motionKey}
        className="absolute inset-0 flex items-center justify-center animate-pie-in"
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        <div
          className="pie-breathe pie-crisp flex items-center justify-center"
          style={{ animationDelay: loopDelay }}
        >
          <PieChart width={dimension} height={dimension}>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={outerRadius}
              startAngle={90}
              endAngle={-270}
              paddingAngle={paddingAngle}
              cornerRadius={cornerRadius}
              stroke={COLORS.white}
              strokeWidth={strokeWidth}
              shapeRendering="geometricPrecision"
              {...PIE_ANIMATION}
              animationBegin={PIE_ANIMATION.animationBegin + animationDelay}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  const getAccentColor = (lbl: string) => {
    switch (lbl) {
      case "Arrived":
        return "#2e5a43";
      case "Unarrived Guests":
        return "#c86d4e";
      case "Total Invited":
        return "#c59b27";
      case "Arrival Rate":
        return "#0f766e";
      default:
        return "#78716c";
    }
  };
  const accentColor = getAccentColor(label);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white px-4 py-5 shadow-sm transition-all duration-200 hover:shadow-soft"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">{label}</p>
        <span className="size-2 rounded-full shadow-sm" style={{ backgroundColor: accentColor }} aria-hidden />
      </div>
      <p className="mt-3 font-serif text-4xl font-semibold tracking-tight text-stone-800 tabular-nums lining-nums">
        {typeof value === "number" ? formatCount(value) : value}
        {suffix ? (
          <span className="ml-1 text-2xl font-medium text-stone-500">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
}

function SidePanel({
  label,
  metrics,
  accent,
  pendingColor,
  panelBg,
  animationDelay = 120,
}: {
  label: string;
  metrics: SideMetrics;
  accent: string;
  pendingColor: string;
  panelBg: string;
  animationDelay?: number;
}) {
  const pending = Math.max(0, metrics.invited - metrics.arrived);
  const chartData =
    metrics.invited > 0
      ? [
          { key: "arrived", value: Math.max(metrics.arrived, 0), color: accent },
          { key: "pending", value: Math.max(pending, 0.0001), color: pendingColor },
        ]
      : [{ key: "empty", value: 1, color: COLORS.track }];

  return (
    <div
      className="rounded-[1.35rem] border border-stone-200/80 px-4 py-5 sm:px-5 sm:py-6 shadow-sm transition-all hover:shadow-md"
      style={{ backgroundColor: panelBg, borderTop: `3px solid ${accent}` }}
    >
      <p
        className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.2em] uppercase"
        style={{ color: accent }}
      >
        <span
          className="size-2 rounded-full shadow-sm"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
        {label}
      </p>

      <div className="mt-4 sm:mt-5">
        <FilledPieChart
          data={chartData}
          accent={accent}
          dimension={150}
          outerRadius={68}
          animationDelay={animationDelay}
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:mt-6">
        <div className="relative rounded-xl border border-stone-200/70 bg-white px-3.5 py-2.5 shadow-sm">
          <span
            className="absolute top-3 right-3 size-1.5 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <p className="font-serif text-xl font-semibold text-stone-800 tabular-nums lining-nums leading-none">
            {formatCount(metrics.invited)}
          </p>
          <p className="mt-1 text-[0.58rem] font-semibold tracking-[0.18em] text-stone-500 uppercase">
            Invited
          </p>
        </div>

        <div className="relative rounded-xl border border-stone-200/70 bg-white px-3.5 py-2.5 shadow-sm">
          <span
            className="absolute top-3 right-3 size-1.5 rounded-full"
            style={{ backgroundColor: COLORS.grey }}
            aria-hidden
          />
          <p className="font-serif text-xl font-semibold text-stone-800 tabular-nums lining-nums leading-none">
            {formatCount(pending)}
          </p>
          <p className="mt-1 text-[0.58rem] font-semibold tracking-[0.18em] text-stone-500 uppercase">
            Pending
          </p>
        </div>

        <div className="relative rounded-xl border border-stone-200/70 bg-white px-3.5 py-2.5 shadow-sm">
          <span
            className="absolute top-3 right-3 size-1.5 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <p className="font-serif text-xl font-semibold text-stone-800 tabular-nums lining-nums leading-none">
            {formatCount(metrics.arrived)}
          </p>
          <p className="mt-1 text-[0.58rem] font-semibold tracking-[0.18em] text-stone-500 uppercase">
            Checked In
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckInProgressCard({ summary }: { summary: DashboardSummary }) {
  const chartData =
    summary.totalInvited > 0
      ? [
          { key: "arrived", value: Math.max(summary.arrived, 0), color: COLORS.green },
          { key: "unarrived", value: Math.max(summary.unarrived, 0.0001), color: COLORS.greenLight },
        ]
      : [{ key: "empty", value: 1, color: COLORS.track }];

  return (
    <div className="rounded-[1.5rem] border border-stone-200/80 bg-white px-5 py-6 shadow-sm sm:px-6 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-stone-800 sm:text-2xl">
          Total Check-In Progress
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-stone-50 px-3 py-1 text-[0.65rem] font-medium tracking-[0.06em] text-stone-700">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: COLORS.green }}
            aria-hidden
          />
          Overall Attendance
        </span>
      </div>

      <div className="mt-8 flex flex-col gap-6 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <FilledPieChart
          data={chartData}
          accent={COLORS.green}
          dimension={168}
          outerRadius={76}
          animationDelay={0}
        />

        <div className="flex w-full max-w-[220px] flex-col gap-3 self-center sm:w-auto sm:self-auto">
          <div className="relative rounded-2xl border border-stone-200/70 bg-white px-4 py-3.5 shadow-sm">
            <span
              className="absolute top-3 right-3 size-2 rounded-full"
              style={{ backgroundColor: COLORS.green }}
              aria-hidden
            />
            <p className="pr-4 font-serif text-2xl font-semibold text-stone-800 tabular-nums lining-nums leading-none">
              {formatCount(summary.arrived)}
              <span className="ml-1.5 text-sm font-normal text-stone-500">guests</span>
            </p>
            <p className="mt-1.5 text-[0.65rem] font-semibold tracking-[0.18em] text-stone-500 uppercase">
              Arrived
            </p>
          </div>

          <div className="relative rounded-2xl border border-stone-200/70 bg-white px-4 py-3.5 shadow-sm">
            <span
              className="absolute top-3 right-3 size-2 rounded-full"
              style={{ backgroundColor: COLORS.grey }}
              aria-hidden
            />
            <p className="pr-4 font-serif text-2xl font-semibold text-stone-800 tabular-nums lining-nums leading-none">
              {formatCount(summary.unarrived)}
              <span className="ml-1.5 text-sm font-normal text-stone-500">pending</span>
            </p>
            <p className="mt-1.5 text-[0.65rem] font-semibold tracking-[0.18em] text-stone-500 uppercase">
              Unarrived
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideComparisonCard({ matrix }: { matrix: BrideGroomMatrix }) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200/80 bg-white px-4 py-6 shadow-sm sm:px-6 sm:py-7">
      <div className="text-center">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-stone-800 sm:text-2xl">
          Bride&apos;s Side vs. Groom&apos;s Side
        </h2>
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5">
        <SidePanel
          label="Bride's Side"
          metrics={matrix.bride}
          accent={COLORS.brideArrived}
          pendingColor={COLORS.bridePending}
          panelBg={COLORS.bridePanel}
          animationDelay={140}
        />
        <SidePanel
          label="Groom's Side"
          metrics={matrix.groom}
          accent={COLORS.groomArrived}
          pendingColor={COLORS.groomPending}
          panelBg={COLORS.groomPanel}
          animationDelay={280}
        />
      </div>
    </div>
  );
}

function RecentCheckInsTable({ checkIns }: { checkIns: CheckInEntry[] }) {
  const [filter, setFilter] = useState<string>("All Sides");

  const filteredCheckIns = checkIns.filter((item) => {
    if (filter === "Bride") return item.side === "Bride";
    if (filter === "Groom") return item.side === "Groom";
    return true;
  });

  const displayedCheckIns = filteredCheckIns;

  return (
    <div className="rounded-[1.5rem] border border-stone-200/80 bg-white px-5 py-6 shadow-sm sm:px-6 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-stone-100">
        <div>
          <h2 className="font-serif text-xl font-semibold tracking-tight text-stone-800 sm:text-2xl">
            Recent Check-Ins ({checkIns.length} Guests)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-full border border-stone-200/80 bg-stone-50 px-3.5 py-1.5 text-xs font-medium text-stone-700 outline-none focus:border-stone-400"
          >
            <option value="All Sides">Filter: All Sides</option>
            <option value="Bride">Bride&apos;s Side</option>
            <option value="Groom">Groom&apos;s Side</option>
          </select>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[560px] mt-4">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white z-10 shadow-sm">
            <tr className="border-b border-stone-100 text-[0.68rem] font-semibold tracking-[0.18em] text-stone-400 uppercase">
              <th className="py-3 px-3 font-medium">Guest Name</th>
              <th className="py-3 px-3 font-medium">Family Name</th>
              <th className="py-3 px-3 font-medium">Side</th>
              <th className="py-3 px-3 font-medium">Category</th>
              <th className="py-3 px-3 font-medium">Family Status</th>
              <th className="py-3 px-3 font-medium">Number Allowed</th>
              <th className="py-3 px-3 font-medium">Time</th>
              <th className="py-3 px-3 font-medium text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50 text-sm">
            {displayedCheckIns.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-stone-400">
                  No check-ins recorded yet.
                </td>
              </tr>
            ) : (
              displayedCheckIns.map((item) => {
                const sideBg =
                  item.side === "Groom"
                    ? "bg-[#f4ebd0] text-[#8c6d1a]"
                    : item.side === "Bride"
                    ? "bg-[#f2d1c9] text-[#9c4a30]"
                    : "bg-stone-100 text-stone-600";

                return (
                  <tr key={item.id} className="transition-colors hover:bg-stone-50/60">
                    <td className="py-4 px-3 font-medium text-stone-800">{item.guestName}</td>
                    <td className="py-4 px-3 text-stone-600">{item.familyName ?? "—"}</td>
                    <td className="py-4 px-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sideBg}`}>
                        {item.side}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-stone-600">{item.category ?? "—"}</td>
                    <td className="py-4 px-3 text-stone-600">{item.familyStatus ?? "—"}</td>
                    <td className="py-4 px-3 text-stone-600">{item.numberAllowed}</td>
                    <td className="py-4 px-3 text-stone-500 tabular-nums">
                      {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </td>
                    <td className="py-4 px-3 text-right">
                      <Link
                        href="/reports"
                        className="text-xs font-semibold text-stone-700 underline underline-offset-4 transition-colors hover:text-stone-900"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between pt-4 border-t border-stone-100 text-xs text-stone-500">
        <span>Showing all {filteredCheckIns.length} check-in entries</span>
        <Link href="/reports" className="font-semibold text-stone-800 hover:underline">
          View All Check-Ins →
        </Link>
      </div>
    </div>
  );
}

export function AdminDashboard({
  summary: initialSummary,
  matrix: initialMatrix,
  recentCheckIns: initialCheckIns = [],
}: {
  summary: DashboardSummary;
  matrix: BrideGroomMatrix;
  recentCheckIns?: CheckInEntry[];
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [matrix, setMatrix] = useState(initialMatrix);
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>(initialCheckIns);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok && data.success) {
          if (data.summary) setSummary(data.summary);
          if (data.matrix) setMatrix(data.matrix);
          if (data.recentCheckIns) setCheckIns(data.recentCheckIns);
        }
      } catch {
        /* keep last good snapshot */
      }
    }

    const id = setInterval(() => void refresh(), 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <PieMotionStyles />

      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="animate-fade-up flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-[0.28em] text-stone-500 uppercase">Overview</p>
            <h1 className="font-serif text-3xl font-semibold tracking-wide text-stone-800 sm:text-4xl">
              Wedding Desk
            </h1>
          </div>
          <Link
            href="/reports/roster"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            Print Guest List
          </Link>
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

        <section className="animate-fade-up animate-delay-2 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
          <CheckInProgressCard summary={summary} />
          <SideComparisonCard matrix={matrix} />
        </section>

        <section className="animate-fade-up animate-delay-3">
          <RecentCheckInsTable checkIns={checkIns} />
        </section>
      </div>
    </main>
  );
}