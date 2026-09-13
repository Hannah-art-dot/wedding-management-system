"use client";

import { useCallback, useState } from "react";
import { ReportActions } from "@/components/reports/report-actions";
import { BackButton } from "@/components/layout/back-button";
import {
  fetchLiveGuestReportRows,
  type GuestReportRow,
} from "@/components/reports/report-shared";
import { formatCount } from "@/lib/utils";

export function MasterGuestReport({ rows: initialRows }: { rows: GuestReportRow[] }) {
  const [rows, setRows] = useState(initialRows);

  const onFetchLiveRows = useCallback(async () => {
    const live = await fetchLiveGuestReportRows();
    setRows(live);
    return live;
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:py-10">
      <BackButton href="/" />
      <ReportActions
        title="Complete Guest List"
        csvFilename="our-wedding-complete-guest-list.csv"
        onFetchLiveRows={onFetchLiveRows}
      />
      <div className="report-print-surface overflow-x-auto rounded-xl border border-border/80 bg-card/95 print:border-0">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-secondary/30">
              {[
                "Guest",
                "Family",
                "Side",
                "Category",
                "RSVP",
                "Attendance",
                "Ticket",
                "Allowed",
                "Checked In",
              ].map((h) => (
                <th key={h} className="px-3 py-3 text-xs font-medium tracking-wide uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.guestId} className="border-b border-border/50">
                <td className="px-3 py-2.5 font-medium">{r.fullName}</td>
                <td className="px-3 py-2.5">{r.familyName ?? "—"}</td>
                <td className="px-3 py-2.5">{r.side}</td>
                <td className="px-3 py-2.5">{r.category ?? "—"}</td>
                <td className="px-3 py-2.5">
                  {r.rsvpStatus === "DECLINED" ? "NOT_COMING" : r.rsvpStatus}
                </td>
                <td className="px-3 py-2.5">{r.attendanceStatus}</td>
                <td className="px-3 py-2.5 tabular-nums lining-nums">{r.ticketNumber ?? "—"}</td>
                <td className="px-3 py-2.5 tabular-nums lining-nums">
                  {r.numberAllowed != null ? formatCount(r.numberAllowed) : "—"}
                </td>
                <td className="px-3 py-2.5 tabular-nums lining-nums">
                  {formatCount(r.numberUsed ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
