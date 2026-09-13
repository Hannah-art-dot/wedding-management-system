import { cn } from "@/lib/utils";

/** Delicate minimalist botanical accents for the wedding theme. */
export function FloralAccent({
  className,
  mirror = false,
}: {
  className?: string;
  mirror?: boolean;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 160"
      fill="none"
      className={cn("text-accent/40", mirror && "-scale-x-100", className)}
    >
      <path
        d="M60 152 C58 120 42 98 28 78 C18 64 22 48 34 42 C46 36 56 48 60 62"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M60 152 C62 118 78 96 94 74 C104 60 100 44 88 40 C76 36 66 50 60 62"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M60 96 C48 86 40 70 42 56 C44 44 54 40 60 48 C66 40 76 44 78 56 C80 70 72 86 60 96Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M34 70 C26 62 18 52 20 42 C22 34 30 32 34 38 C38 32 46 36 44 46 C42 56 38 64 34 70Z"
        fill="currentColor"
        opacity="0.28"
      />
      <path
        d="M86 68 C94 60 102 50 100 40 C98 32 90 32 86 38 C82 32 74 36 76 46 C78 56 82 62 86 68Z"
        fill="currentColor"
        opacity="0.28"
      />
      <circle cx="60" cy="42" r="3.5" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export function FloralCorner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 80 80"
      fill="none"
      className={cn("text-primary/25", className)}
    >
      <path
        d="M8 72 C18 52 32 38 52 28"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M52 28 C44 24 40 16 42 10 C48 12 54 18 56 26 C62 22 70 24 72 30 C64 32 56 34 52 28Z"
        fill="currentColor"
        opacity="0.5"
      />
      <path
        d="M28 48 C22 44 16 36 18 30 C24 32 30 38 32 46 C26 48 22 52 28 48Z"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  );
}
