"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { BackButton } from "@/components/layout/back-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED =
  ".csv,.xlsx,.xls,.xlsm,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export function GuestImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onPick(next: File | null) {
    setFile(next);
    setError(null);
    setMessage(null);
  }

  async function onImport() {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const me = await fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null));
      if (me?.user?.id) body.append("importedByUserId", me.user.id);

      const res = await fetch("/api/guests/import", { method: "POST", body });
      const data = await res.json();

      if (!res.ok && !data.success) {
        setError(data.error ?? "Import failed.");
        return;
      }

      setMessage(
        data.stats
          ? `Imported ${data.stats.guestsCreated ?? data.stats.imported} guests`
          : (data.message ?? "Import complete."),
      );
      if (data.success) onPick(null);
    } catch {
      setError("Network error while uploading.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-8 sm:py-10">
      <BackButton href="/guests" />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const next = e.dataTransfer.files?.[0] ?? null;
          if (next) onPick(next);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center transition-colors",
          dragging
            ? "border-accent bg-accent/15"
            : "border-border/80 bg-background/40 hover:border-accent/70",
        )}
      >
        <FileSpreadsheet className="size-8 text-primary" />
        <p className="font-medium">{file ? file.name : "Drop CSV or Excel here"}</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>

      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={!file || busy}
          onClick={() => onPick(null)}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="champagne"
          className="flex-1"
          disabled={!file || busy}
          onClick={() => void onImport()}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <Upload className="size-4" />
              Import File
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
