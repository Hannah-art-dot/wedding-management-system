import { FamilyDetail } from "@/components/families/FamilyDetail";

export const metadata = {
  title: "Family",
  description: "Family unit detail and members",
};

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex-1">
      <FamilyDetail familyId={id} />
    </main>
  );
}
