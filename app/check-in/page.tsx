import { CheckInClient } from "@/components/check-in/CheckInClient";
import Link from "next/link";

export const metadata = {
  title: "Check-in",
  description: "Venue gate guest check-in by name, phone, or ticket",
};

export default function CheckInPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:pt-8 pb-0">
        <Link className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-1.5 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 transition-colors" href="/">
          <span>←</span> Back
        </Link>
      </div>
      <CheckInClient />
    </main>
  );
}
