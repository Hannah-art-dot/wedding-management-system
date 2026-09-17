import { Suspense } from "react";
import { GuestDirectory } from "@/components/guests/GuestDirectory";
import { searchForCheckIn } from "@/services/check-in";

export const metadata = {
  title: "Guests Directory",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GuestsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === "string" ? resolvedParams.q : "";
  const side = typeof resolvedParams.side === "string" ? resolvedParams.side : "ALL";

  let results = q.length >= 2 ? await searchForCheckIn(q) : [];

  if (side !== "ALL") {
    results = results.filter((g) => g.side === side);
  }

  return (
    <main className="flex-1">
      <Suspense fallback={<div className="animate-pulse bg-muted h-96 w-full max-w-4xl mx-auto mt-10 rounded-xl" />}>
        <GuestDirectory results={results} query={q} side={side} />
      </Suspense>
    </main>
  );
}
