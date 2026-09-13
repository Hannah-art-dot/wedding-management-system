"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ href, label = "Back" }: { href?: string; label?: string }) {
  const router = useRouter();

  if (href) {
    return (
      <Button asChild type="button" variant="outline" size="sm" className="print:hidden">
        <Link href={href}>
          <ArrowLeft className="size-4" />
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="print:hidden"
      onClick={() => router.back()}
    >
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  );
}
