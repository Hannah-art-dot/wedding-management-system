"use client";

import { useState } from "react";
import { Loader2, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Side } from "@/lib/enums";

export type ImportBatchData = {
  id: string;
  fileName: string;
  rowCount: number;
  createdAt: string;
  guests: {
    id: string;
    fullName: string;
    familyId: string | null;
    family: { familyName: string } | null;
    side: Side;
    category: string | null;
    numberAttending: number | null;
    familyStatus: string | null;
  }[];
};

type Props = {
  batch: ImportBatchData;
  onClose: () => void;
  onSaved: () => void;
};

export function GuestImportBatchEditor({ batch, onClose, onSaved }: Props) {
  const [guests, setGuests] = useState(batch.guests.map((g) => ({ ...g })));
  const [busy, setBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredGuests = guests.filter((g) =>
    g.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFieldChange = (id: string, field: string, value: string | number) => {
    setGuests((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          if (field === "familyName" && g.family) {
            return { ...g, family: { familyName: value as string } };
          }
          return { ...g, [field]: value };
        }
        return g;
      })
    );
  };

  const handleRemoveRow = (id: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const payload = {
        guests: guests.map((g) => ({
          id: g.id,
          fullName: g.fullName,
          familyName: g.family?.familyName || "Unknown Family",
          side: g.side,
          category: g.category,
          numberAttending: g.numberAttending || 1,
          familyStatus: g.familyStatus || "Individual",
        })),
      };

      const res = await fetch(`/api/guests/import/batch/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
      } else {
        alert("Failed to save changes.");
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">Editing: {batch.fileName}</h2>
            <p className="text-sm text-muted-foreground">{guests.length} rows</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
              <X className="mr-2 size-4" /> Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-card shadow-sm">
              <tr>
                <th className="p-2 font-medium text-muted-foreground">Full Name</th>
                <th className="p-2 font-medium text-muted-foreground">Family Name</th>
                <th className="p-2 font-medium text-muted-foreground">Side</th>
                <th className="p-2 font-medium text-muted-foreground">Category</th>
                <th className="p-2 font-medium text-muted-foreground">No. Allowed</th>
                <th className="p-2 font-medium text-muted-foreground">Family Status</th>
                <th className="p-2 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((g) => (
                <tr key={g.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-2">
                    <Input
                      value={g.fullName}
                      onChange={(e) => handleFieldChange(g.id, "fullName", e.target.value)}
                      className="h-8"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={g.family?.familyName || ""}
                      onChange={(e) => handleFieldChange(g.id, "familyName", e.target.value)}
                      className="h-8"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={g.side}
                      onChange={(e) => handleFieldChange(g.id, "side", e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="BRIDE">Bride</option>
                      <option value="GROOM">Groom</option>
                      <option value="NEUTRAL">Neutral</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <Input
                      value={g.category || ""}
                      onChange={(e) => handleFieldChange(g.id, "category", e.target.value)}
                      className="h-8"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={1}
                      value={g.numberAttending || 1}
                      onChange={(e) => handleFieldChange(g.id, "numberAttending", parseInt(e.target.value, 10))}
                      className="h-8 w-20"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={g.familyStatus || "Individual"}
                      onChange={(e) => handleFieldChange(g.id, "familyStatus", e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Family">Family</option>
                      <option value="Group">Group</option>
                    </select>
                  </td>
                  <td className="p-2 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveRow(g.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredGuests.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    No rows found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
