"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const underlineField = cn(
  "h-11 rounded-none border-0 border-b border-[#e7e0d6]/80 bg-transparent px-0",
  "text-[#fffcf8] shadow-none",
  "placeholder:text-[#fffcf8]/45",
  "focus-visible:border-[#c4a484] focus-visible:ring-0 focus-visible:ring-offset-0",
  "caret-[#c4a484]",
);

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function clearCredentials() {
    setUsername("");
    setPassword("");
  }

  // Always start clean after logout / idle redirect / revisit of login.
  useEffect(() => {
    clearCredentials();
    setError(null);
    setBusy(false);
  }, [searchParams]);

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
        clearCredentials();
        setError(data.error ?? "Sign-in failed.");
        return;
      }
      clearCredentials();
      const next = searchParams.get("next");
      router.replace(data.redirectTo ?? next ?? "/");
      router.refresh();
    } catch {
      clearCredentials();
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-4 py-8 sm:px-6 sm:py-10 md:px-8">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="animate-fade-down text-center">
          <p className="text-[0.7rem] font-medium tracking-[0.35em] text-[#e8d5a8]/85 uppercase">
            Welcome
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-wide text-[#fffcf8] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-5xl md:text-6xl">
            Our Wedding
          </h1>
        </div>

        <form
          className="animate-fade-up-soft animate-delay-login-card mt-10 flex w-full flex-col gap-7 sm:mt-12"
          onSubmit={(e) => void onSubmit(e)}
          autoComplete="on"
        >
          <label className="flex flex-col gap-2">
            <span className="text-[0.7rem] font-medium tracking-[0.22em] text-[#e8d5a8]/90 uppercase">
              Username
            </span>
            <Input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={underlineField}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[0.7rem] font-medium tracking-[0.22em] text-[#e8d5a8]/90 uppercase">
              Password
            </span>
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={underlineField}
            />
          </label>

          {error ? (
            <Alert variant="destructive" className="border-[#e7e0d6]/40 bg-[#fffcf8]/15 text-[#fffcf8]">
              {error}
            </Alert>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={busy}
            className="mt-2 h-11 w-full rounded-full bg-[#c4a484] text-[#fffcf8] shadow-soft transition-all duration-200 hover:bg-[#b8956f] hover:shadow-elevated"
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
  );
}
