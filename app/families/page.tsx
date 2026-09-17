import { FamilyDirectory } from "@/components/families/FamilyDirectory";
import { listFamilies } from "@/services/guest-registration";

export const metadata = {
  title: "Families",
  description: "Family units and household management",
};

export default async function FamiliesPage() {
  const families = await listFamilies();

  return (
    <main className="flex-1">
      <FamilyDirectory families={families} />
    </main>
  );
}
