import { CheckInClient } from "@/components/check-in/CheckInClient";

export const metadata = {
  title: "Check-in | Wedding Guest Management",
  description: "Text search guest check-in for venue staff",
};

export default function CheckInPage() {
  return (
    <main className="min-h-full bg-gradient-to-b from-stone-100 via-stone-50 to-emerald-50/40">
      <CheckInClient />
    </main>
  );
}
