import { FamilyForm } from "@/components/families/FamilyForm";

export const metadata = {
  title: "New family",
  description: "Create a family unit",
};

export default function NewFamilyPage() {
  return (
    <main className="flex-1">
      <FamilyForm />
    </main>
  );
}
