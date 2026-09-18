import { GuestRegistrationForm } from "@/components/guests/GuestRegistrationForm";

export const metadata = {
  title: "Add Guest",
};

export default function NewGuestPage() {
  return (
    <main className="flex-1 flex flex-col justify-center">
      <GuestRegistrationForm />
    </main>
  );
}
