"use client";

import { usePathname } from "next/navigation";
import { IdleLogoutGuard } from "@/components/auth/idle-logout-guard";
import { SideNav } from "@/components/layout/side-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <IdleLogoutGuard />
      {hideNav ? (
        <div className="flex flex-1 flex-col">{children}</div>
      ) : (
        <div className="flex min-h-full flex-1 flex-col sm:flex-row">
          <SideNav />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      )}
    </div>
  );
}
