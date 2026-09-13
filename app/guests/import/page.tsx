import { GuestImportPanel } from "@/components/guests/GuestImportPanel";

export const metadata = {
  title: "Import guests",
  description: "Bulk import guests and families from CSV or Excel",
};

export default function GuestImportPage() {
  return (
    <main className="flex-1">
      <GuestImportPanel />
    </main>
  );
}
