"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guestRowsToCsv, type GuestReportRow } from "@/components/reports/report-shared";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportActions({
  csvFilename,
  onFetchLiveRows,
}: {
  title?: string;
  csvFilename: string;
  /** Must refresh UI state AND return the same rows used for print/CSV. */
  onFetchLiveRows: () => Promise<GuestReportRow[]>;
}) {
  const [busy, setBusy] = useState<"print" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function withLiveRows(
    mode: "print" | "download",
    action: (rows: GuestReportRow[]) => void | Promise<void>,
  ) {
    setBusy(mode);
    setError(null);
    try {
      // Single fetch → UI table updates via caller setState, then print/CSV use same array.
      const rows = await onFetchLiveRows();
      await action(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load live guest list.");
    } finally {
      setBusy(null);
    }
  }

  function printLive() {
    void withLiveRows("print", async () => {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      await new Promise((r) => setTimeout(r, 50));
      window.print();
    });
  }

  function downloadCsv() {
    void withLiveRows("download", (rows) => {
      const csv = guestRowsToCsv(rows);
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), csvFilename);
    });
  }

  return (
    <div className="print:hidden space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="champagne"
          size="lg"
          className="h-14 flex-1"
          disabled={Boolean(busy)}
          onClick={printLive}
        >
          {busy === "print" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Printer className="size-4" />
          )}
          Print Complete Guest List
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-14 flex-1"
          disabled={Boolean(busy)}
          onClick={downloadCsv}
        >
          {busy === "download" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download CSV
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
