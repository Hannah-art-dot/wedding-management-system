import type { BrideGroomMatrix, DashboardSummary } from "@/services/analytics";
import { formatCount } from "@/lib/utils";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-sans text-4xl font-semibold tracking-tight tabular-nums lining-nums">
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
        <section className="grid gap-3 sm:grid-cols-3">
          <Stat label="Arrived" value={summary.arrived} />
          <Stat label="Unarrived Guests" value={summary.unarrived} />
          <Stat label="Total Invited" value={summary.totalInvited} />
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-5">
            <p className="text-sm text-muted-foreground">Bride&apos;s Side</p>
            <p className="mt-2 font-sans text-3xl font-semibold tabular-nums lining-nums">
              {formatCount(matrix.bride.coming)}
              <span className="text-lg font-normal text-muted-foreground">
                {" "}
                / {formatCount(matrix.bride.invited)} invited
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-5">
            <p className="text-sm text-muted-foreground">Groom&apos;s Side</p>
            <p className="mt-2 font-sans text-3xl font-semibold tabular-nums lining-nums">
              {formatCount(matrix.groom.coming)}
              <span className="text-lg font-normal text-muted-foreground">
                {" "}
                / {formatCount(matrix.groom.invited)} invited
              </span>
            </p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="CONFIRMED" value={summary.confirmed} />
          <Stat label="NOT_COMING" value={summary.notComing} />
          <Stat label="PENDING" value={summary.pending} />
          <Stat label="MAYBE" value={summary.maybe} />
        </section>
      </div>
    </main>
  );
}
