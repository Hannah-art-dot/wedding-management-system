"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IDLE_TIMEOUT_MS } from "@/lib/auth-shared";

/** Logs out after IDLE_TIMEOUT_MS without pointer/keyboard activity (SRS). */
export function IdleLogoutGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;

    let timer: ReturnType<typeof setTimeout>;

    const logout = () => {
      void fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        router.replace("/login?reason=idle");
        router.refresh();
      });
    };

    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, IDLE_TIMEOUT_MS);
    };

    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    for (const ev of events) window.addEventListener(ev, bump, { passive: true });
    bump();

    return () => {
      clearTimeout(timer);
      for (const ev of events) window.removeEventListener(ev, bump);
    };
  }, [pathname, router]);

  return null;
}
