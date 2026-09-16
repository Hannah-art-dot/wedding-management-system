"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { canManageGuests, type SessionUser } from "@/lib/auth-shared";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/check-in", label: "Check-In" },
  { href: "/guests", label: "Add Guests" },
  { href: "/users", label: "Users" },
  { href: "/reports", label: "Reports" },
] as const;

function linkIsActive(pathname: string | null, href: string) {
  if (href === "/") return pathname === "/" || pathname === "/dashboard";
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

const navSurface = "border-stone-200/80 bg-[#fbf9f5]/90 backdrop-blur-md";
const linkBase =
  "rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200";
const linkIdle = "text-stone-500 hover:bg-stone-200/70 hover:text-stone-900";
const linkActive = "bg-accent/35 text-stone-900 shadow-sm";

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    setMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login?reason=logout");
    router.refresh();
  }

  const isStaff = user?.role === "CHECKIN_STAFF";
  const isAdmin = user ? canManageGuests(user.role) : false;

  if (!user) {
    return (
      <>
        <header
          className={cn(
            "flex w-full shrink-0 items-center justify-between border-b px-4 py-3 md:hidden",
            navSurface,
          )}
        >
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-stone-900">
            Our Wedding
          </Link>
        </header>
        <aside
          className={cn(
            "hidden w-56 shrink-0 flex-col border-r px-4 py-4 md:flex md:min-h-full",
            navSurface,
          )}
        >
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-stone-900">
            Our Wedding
          </Link>
        </aside>
      </>
    );
  }

  if (isStaff) {
    return (
      <>
        {/* Mobile top bar */}
        <header
          className={cn(
            "relative z-40 flex w-full shrink-0 flex-col border-b md:hidden",
            navSurface,
          )}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <Link
              href="/check-in"
              className="font-display text-2xl font-semibold tracking-tight text-stone-900"
              onClick={() => setMenuOpen(false)}
            >
              Our Wedding
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex size-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-200/70 hover:text-stone-900"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
          {menuOpen ? (
            <nav
              className="flex flex-col gap-1 border-t border-border/70 px-3 py-3"
              aria-label="Mobile"
            >
              <button
                type="button"
                onClick={() => void logout()}
                className={cn(linkBase, linkIdle, "flex w-full items-center gap-2 text-left")}
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </nav>
          ) : null}
        </header>

        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden w-56 shrink-0 flex-col border-r px-4 py-4 md:flex md:min-h-full",
            navSurface,
          )}
        >
          <Link
            href="/check-in"
            className="font-display text-2xl font-semibold tracking-tight text-stone-900"
          >
            Our Wedding
          </Link>
          <div className="mt-auto pt-8">
            <button
              type="button"
              onClick={() => void logout()}
              className={cn(linkBase, linkIdle, "flex w-full items-center gap-2")}
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
          </div>
        </aside>
      </>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      {/* Mobile top bar + slide-down menu */}
      <header
        className={cn(
          "relative z-40 flex w-full shrink-0 flex-col border-b md:hidden",
          navSurface,
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="font-display text-2xl font-semibold tracking-tight text-stone-900"
            onClick={() => setMenuOpen(false)}
          >
            Our Wedding
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-200/70 hover:text-stone-900"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {menuOpen ? (
          <nav
            className="flex flex-col gap-1 border-t border-border/70 px-3 py-3"
            aria-label="Mobile"
          >
            {ADMIN_LINKS.map((link) => {
              const active = linkIsActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(linkBase, active ? linkActive : linkIdle)}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void logout()}
              className={cn(linkBase, linkIdle, "mt-1 flex w-full items-center gap-2 text-left")}
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
          </nav>
        ) : null}
      </header>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden w-56 shrink-0 flex-col border-r px-4 py-4 md:flex md:min-h-full",
          navSurface,
        )}
      >
        <Link
          href="/"
          className="mb-6 px-2 font-display text-2xl font-semibold tracking-tight text-stone-900"
        >
          Our Wedding
        </Link>

        <nav className="flex flex-col gap-1" aria-label="Primary">
          {ADMIN_LINKS.map((link) => {
            const active = linkIsActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(linkBase, active ? linkActive : linkIdle)}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={() => void logout()}
            className={cn(linkBase, linkIdle, "flex w-full items-center gap-2")}
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
