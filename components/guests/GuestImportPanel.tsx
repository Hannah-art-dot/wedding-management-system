"use client";

import { useRef, useState, useEffect } from "react";
import { FileSpreadsheet, Loader2, Upload, Trash2, Edit } from "lucide-react";
import { BackButton } from "@/components/layout/back-button";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GuestImportBatchEditor, type ImportBatchData } from "./GuestImportBatchEditor";

const ACCEPTED =
  ".csv,.xlsx,.xls,.xlsm,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export function GuestImportPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [batches, setBatches] = useState<ImportBatchData[]>([]);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/guests/import/batch/all");
      const data = await res.json();
      if (data.success && data.batches) {
        setBatches(data.batches);
      } else {
        setBatches([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

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
      if (data.success) {
        onPick(null);
        await fetchBatches();
      }
    } catch {
      setError("Network error while uploading.");
    } finally {
      setBusy(false);
    }
  }

  const handleDeleteBatch = async (batchId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to remove ${fileName} and all associated guests?`)) return;

    setDeletingBatchId(batchId);
    try {
      const res = await fetch(`/api/guests/import/batch/${batchId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(data.message || "Batch and associated guests deleted successfully.");
        await fetchBatches();
        router.refresh();
      } else {
        setError("Failed to delete batch.");
      }
    } catch {
      setError("Network error while deleting.");
    } finally {
      setDeletingBatchId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-8 sm:py-10">
      <BackButton href="/guests" />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Imported Files</h2>
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files currently imported.</p>
        ) : (
          batches.map((batch) => (
            <div key={batch.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileSpreadsheet className="size-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{batch.fileName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {batch.id === "legacy-batch" ? "" : `Imported on ${new Date(batch.createdAt).toLocaleString()} \u2022 `}
                    {batch.rowCount} rows
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingBatchId(batch.id)} disabled={deletingBatchId !== null}>
                  <Edit className="mr-2 size-4" /> Edit File
                </Button>
                <Button variant="outline" className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={() => handleDeleteBatch(batch.id, batch.fileName)} disabled={deletingBatchId !== null}>
                  {deletingBatchId === batch.id ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 size-4" />
                  )}
                  Delete File
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingBatchId && (
        <GuestImportBatchEditor
          batch={batches.find(b => b.id === editingBatchId)!}
          onClose={() => setEditingBatchId(null)}
          onSaved={() => {
            setEditingBatchId(null);
            setMessage("Batch updated successfully.");
            fetchBatches();
          }}
        />
      )}

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
