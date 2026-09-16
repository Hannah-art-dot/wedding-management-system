import { SESSION_COOKIE } from "@/lib/auth-shared";

/**
 * Wipe any client-side session residue after logout.
 * Auth is cookie-based (`ow_session`); storage is cleared defensively.
 */
export function clearClientAuthState(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.clear();
  } catch {
    /* ignore quota / private-mode errors */
  }

  try {
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }

  // Best-effort clear of non-httpOnly copies if any script ever set them.
  try {
    document.cookie = `${SESSION_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

/** Server logout + client wipe + redirect to a clean login screen. */
export async function performLogout(redirectTo = "/login?reason=logout"): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    /* still wipe client state */
  } finally {
    clearClientAuthState();
  }

  if (typeof window !== "undefined") {
    window.location.replace(redirectTo);
  }
}
