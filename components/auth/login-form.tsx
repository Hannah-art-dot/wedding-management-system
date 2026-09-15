"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Sign-in failed.");
        return;
      }
      const next = searchParams.get("next");
      router.replace(data.redirectTo ?? next ?? "/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-4 py-8 sm:px-6 sm:py-10 md:px-8">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="animate-fade-down text-center">
          <p className="text-[0.7rem] font-medium tracking-[0.35em] text-[#e8d5a8]/80 uppercase">
            Welcome
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-wide text-[#f0e0b8] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-5xl md:text-6xl">
            Our Wedding
          </h1>
        </div>

        <div className="animate-fade-up-soft animate-delay-login-card mt-6 w-full rounded-2xl border border-stone-200/70 bg-white/92 p-4 shadow-xl sm:mt-8 sm:p-5 md:p-6">
          <form className="flex flex-col gap-3.5" onSubmit={(e) => void onSubmit(e)}>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-stone-600 uppercase">
                Username
              </span>
              <Input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-10 border-stone-200/80 bg-white/90 shadow-sm transition-all duration-200 focus-visible:border-accent focus-visible:ring-accent/30"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-stone-600 uppercase">
                Password
              </span>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 border-stone-200/80 bg-white/90 shadow-sm transition-all duration-200 focus-visible:border-accent focus-visible:ring-accent/30"
              />
            </label>

            {error ? <Alert variant="destructive">{error}</Alert> : null}

            <Button
              type="submit"
              size="lg"
              disabled={busy}
              className="mt-0.5 h-10 w-full bg-[#8b6b4a] text-[#fffcf8] shadow-soft transition-all duration-200 hover:bg-[#7a5d41] hover:shadow-elevated"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
