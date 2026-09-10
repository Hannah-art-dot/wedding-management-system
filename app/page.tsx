import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-stone-100 to-emerald-50/50 px-6 py-16">
      <div className="flex w-full max-w-lg flex-col gap-8 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-wide text-emerald-800 uppercase">
            Wedding management
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
            Guest & dinner desk
          </h1>
          <p className="text-base text-stone-600">
            Register guests, track RSVPs, and check people in at the venue by name or ticket
            code.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/check-in"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-800 px-6 text-base font-semibold text-white hover:bg-emerald-900"
          >
            Open check-in
          </Link>
        </div>
      </div>
    </main>
  );
}
