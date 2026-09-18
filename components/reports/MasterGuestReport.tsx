"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { ReportActions } from "@/components/reports/report-actions";
import { BackButton } from "@/components/layout/back-button";
import {
  GUEST_REPORT_COLUMNS,
  GUEST_REPORT_HEADERS,
  fetchLiveGuestReportRows,
  guestReportCellValues,
  type GuestReportRow,
} from "@/components/reports/report-shared";

export function MasterGuestReport({ rows: initialRows }: { rows: GuestReportRow[] }) {
  const [rows, setRows] = useState(initialRows);

  /** One live fetch drives table + print + CSV in parallel (exact same rows). */
  const onFetchLiveRows = useCallback(async () => {
    const live = await fetchLiveGuestReportRows();
    setRows(live);
    return live;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void fetchLiveGuestReportRows()
        .then((live) => {
          if (!cancelled) setRows(live);
        })
        .catch(() => {});
    };
    refresh();
    const id = setInterval(refresh, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const getCount = (r: GuestReportRow) => {
    const candidates = [r.numberAllowed, r.numberAttending];
    for (const value of candidates) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
        return Math.floor(value);
      }
    }
    return 0;
  };

  const { brideTotal, groomTotal, grandTotal } = useMemo(() => {
    const bride = rows.filter((r) => r.side === "BRIDE").reduce((sum, r) => sum + getCount(r), 0);
    const groom = rows.filter((r) => r.side === "GROOM").reduce((sum, r) => sum + getCount(r), 0);
    return {
      brideTotal: bride,
      groomTotal: groom,
      grandTotal: bride + groom,
    };
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-6">
        <BackButton href="/" />
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white/75 p-5 shadow-sm backdrop-blur-sm sm:p-7">
        <div className="mb-5">
          <ReportActions
            title="Complete Guest List"
            csvFilename="our-wedding-complete-guest-list.csv"
            onFetchLiveRows={onFetchLiveRows}
          />
        </div>

        <div className="report-print-surface overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm text-stone-800">
            <thead>
              <tr className="border-b border-stone-200/80 bg-stone-100/60">
                {GUEST_REPORT_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-xs font-medium tracking-[0.14em] text-stone-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={GUEST_REPORT_HEADERS.length}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No guests yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, rowIndex) => {
                  const cells = guestReportCellValues(r);
                  return (
                    <tr
                      key={r.guestId}
                      className="border-b border-stone-200/50 transition-colors duration-200 hover:bg-stone-50/80"
                    >
                      {GUEST_REPORT_COLUMNS.map((col, i) => (
                        <td
                          key={col.header}
                          className={
                            col.header === "#"
                              ? "px-3 py-2.5 tabular-nums lining-nums text-center text-stone-400"
                              : i === 1
                                ? "px-3 py-2.5 font-medium"
                                : col.header === "Number Allowed" || col.header === "Checked In"
                                  ? "px-3 py-2.5 tabular-nums lining-nums"
                                  : col.header === "Card Status"
                                    ? "px-3 py-2.5 text-stone-300"
                                    : "px-3 py-2.5"
                          }
                        >
                          {col.header === "#" ? rowIndex + 1 : col.header === "Card Status" ? "_____" : cells[i]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={GUEST_REPORT_HEADERS.length} className="px-3 py-6">
                    <div className="flex flex-col text-left leading-relaxed">
                      <h3 className="text-xl font-bold text-stone-900 mb-2 print:text-black">
                        Total Number of Invited Guests
                      </h3>
                      <div>
                        <span className="font-extrabold text-lg text-stone-900 print:text-black">Bride's Side= </span>
                        <span className="font-normal text-lg text-stone-700 print:text-black">{brideTotal} guests</span>
                      </div>
                      <div>
                        <span className="font-extrabold text-lg text-stone-900 print:text-black">Groom's Side= </span>
                        <span className="font-normal text-lg text-stone-700 print:text-black">{groomTotal} guests</span>
                      </div>
                      <div>
                        <span className="font-extrabold text-lg text-stone-900 print:text-black">Total= </span>
                        <span className="font-normal text-lg text-stone-700 print:text-black">{grandTotal} guests</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
