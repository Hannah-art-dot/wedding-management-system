import type { BrideGroomMatrix, DashboardSummary } from "@/services/analytics";
import { formatCount } from "@/lib/utils";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/75 px-4 py-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-soft">
      <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">{label}</p>
      <p className="mt-3 font-serif text-4xl font-semibold tracking-tight text-stone-800 tabular-nums lining-nums">
        {formatCount(value)}
      </p>
    </div>
  );
}

export function AdminDashboard({
  summary,
  matrix,
}: {
  summary: DashboardSummary;
  matrix: BrideGroomMatrix;
}) {
  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="animate-fade-up space-y-1">
          <p className="text-xs font-medium tracking-[0.28em] text-stone-500 uppercase">Overview</p>
          <h1 className="font-serif text-3xl font-semibold tracking-wide text-stone-800 sm:text-4xl">
            Wedding Desk
          </h1>
        </header>

        <section className="animate-fade-up animate-delay-1 grid gap-3 sm:grid-cols-3">
          <Stat label="Arrived" value={summary.arrived} />
          <Stat label="Unarrived Guests" value={summary.unarrived} />
          <Stat label="Total Invited" value={summary.totalInvited} />
        </section>

        <section className="animate-fade-up animate-delay-2 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200/80 bg-white/75 px-4 py-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-soft">
            <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">
              Bride&apos;s Side
            </p>
            <p className="mt-3 font-serif text-3xl font-semibold text-stone-800 tabular-nums lining-nums">
              {formatCount(matrix.bride.coming)}
              <span className="text-lg font-normal text-stone-500">
                {" "}
                / {formatCount(matrix.bride.invited)} invited
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white/75 px-4 py-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-soft">
            <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">
              Groom&apos;s Side
            </p>
            <p className="mt-3 font-serif text-3xl font-semibold text-stone-800 tabular-nums lining-nums">
              {formatCount(matrix.groom.coming)}
              <span className="text-lg font-normal text-stone-500">
                {" "}
                / {formatCount(matrix.groom.invited)} invited
              </span>
            </p>
          </div>
        </section>

        <section className="animate-fade-up animate-delay-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="CONFIRMED" value={summary.confirmed} />
          <Stat label="NOT_COMING" value={summary.notComing} />
          <Stat label="PENDING" value={summary.pending} />
          <Stat label="MAYBE" value={summary.maybe} />
        </section>
      </div>
    </main>
  );
}
