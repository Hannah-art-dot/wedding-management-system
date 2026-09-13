"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { canManageGuests, type SessionUser } from "@/lib/auth-shared";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/check-in", label: "Check-In" },
  { href: "/guests", label: "Add Guests" },
  { href: "/users", label: "Users" },
  { href: "/reports", label: "Reports" },
] as const;

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) setUser(data.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const isStaff = user?.role === "CHECKIN_STAFF";
  const isAdmin = user ? canManageGuests(user.role) : false;

  if (!user) {
    return (
      <aside className="flex w-full shrink-0 flex-col border-b border-border/70 bg-card/80 px-4 py-4 sm:w-56 sm:border-r sm:border-b-0">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
          Our Wedding
        </Link>
      </aside>
    );
  }

  if (isStaff) {
    return (
      <aside className="flex w-full shrink-0 flex-col border-b border-border/70 bg-card/80 px-4 py-4 sm:min-h-full sm:w-56 sm:border-r sm:border-b-0">
        <Link
          href="/check-in"
          className="font-display text-2xl font-semibold tracking-tight text-foreground"
        >
          Our Wedding
        </Link>
        <div className="mt-auto hidden pt-8 sm:block">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
        <div className="mt-4 sm:hidden">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
      </aside>
    );
  }

  if (!isAdmin) return null;

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border/70 bg-card/80 px-3 py-4 sm:min-h-full sm:w-56 sm:border-r sm:border-b-0 sm:px-4">
      <Link href="/" className="mb-6 px-2 font-display text-2xl font-semibold tracking-tight">
        Our Wedding
      </Link>

      <nav className="flex flex-row gap-1 overflow-x-auto sm:flex-col sm:gap-1" aria-label="Primary">
        {ADMIN_LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/" || pathname === "/dashboard"
              : pathname === link.href || Boolean(pathname?.startsWith(`${link.href}/`));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/40 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 sm:mt-auto sm:pt-8">
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
