import { FamilyDirectory } from "@/components/families/FamilyDirectory";

export const metadata = {
  title: "Families",
  description: "Family units and household management",
};

export default function FamiliesPage() {
  return (
    <main className="flex-1">
      <FamilyDirectory />
    </main>
  );
}
