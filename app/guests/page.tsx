import { Suspense } from "react";
import { GuestRegistrationForm } from "@/components/guests/GuestRegistrationForm";

export const metadata = {
  title: "Add Guests",
};

export default function GuestsPage() {
  return (
    <main className="flex-1">
      <Suspense fallback={null}>
        <GuestRegistrationForm />
      </Suspense>
    </main>
  );
}
