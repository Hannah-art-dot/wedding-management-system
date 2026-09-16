"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { FloralCorner } from "@/components/brand/floral-accent";
import { Button } from "@/components/ui/button";
import { performLogout } from "@/lib/auth-client";
import { canManageGuests, type SessionUser } from "@/lib/auth-shared";
import { cn } from "@/lib/utils";

export function SiteHeader({
  pathname,
  compact = false,
}: {
  pathname?: string;
  compact?: boolean;
}) {
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

  const links = [
    { href: "/", label: "Dashboard", show: user ? canManageGuests(user.role) : false },
    { href: "/check-in", label: "Check-in", show: true },
    { href: "/guests", label: "Guests", show: user ? canManageGuests(user.role) : false },
    { href: "/families", label: "Families", show: user ? canManageGuests(user.role) : false },
    { href: "/reports", label: "Reports", show: user ? canManageGuests(user.role) : false },
    { href: "/users", label: "Users", show: user ? canManageGuests(user.role) : false },
  ].filter((l) => l.show);

  async function logout() {
    setUser(null);
    await performLogout("/login?reason=logout");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/60 bg-[color-mix(in_oklab,var(--background)_78%,white)]/90 backdrop-blur-md",
        compact ? "py-3" : "py-4",
      )}
    >
      <FloralCorner className="pointer-events-none absolute top-0 left-0 size-16 opacity-70 sm:size-20" />
      <FloralCorner className="pointer-events-none absolute top-0 right-0 size-16 rotate-90 opacity-70 sm:size-20" />

      <div className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={user?.role === "CHECKIN_STAFF" ? "/check-in" : "/"} className="group flex flex-col">
          <span className="font-display text-2xl leading-none font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-[1.7rem]">
            Our Wedding
          </span>
          <span className="mt-1 text-[0.65rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Guest & dinner desk
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/" || pathname === "/dashboard"
                  : pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
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

          {user ? (
            <div className="flex items-center gap-2 border-l border-border/70 pl-2 sm:pl-3">
              <span className="hidden max-w-[9rem] truncate text-xs text-muted-foreground sm:inline">
                {user.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => void logout()}
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
