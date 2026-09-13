import { CheckInClient } from "@/components/check-in/CheckInClient";

export const metadata = {
  title: "Check-in",
  description: "Venue gate guest check-in by name, phone, or ticket",
};

export default function CheckInPage() {
  return (
    <main className="flex-1">
      <CheckInClient />
    </main>
  );
}
