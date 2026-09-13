"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FloralAccent } from "@/components/brand/floral-accent";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="relative mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:py-16">
      <FloralAccent className="pointer-events-none absolute -top-4 -left-6 size-28 opacity-80 sm:size-36" />
      <FloralAccent
        mirror
        className="pointer-events-none absolute -top-4 -right-6 size-28 opacity-80 sm:size-36"
      />

      <div className="relative z-10 text-center">
        <p className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Our Wedding
        </p>
      </div>

      <Card className="relative z-10 border-border/80 bg-card/95">
        <CardContent className="pt-6">
          <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Username</span>
              <Input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Password</span>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </label>

            {error ? <Alert variant="destructive">{error}</Alert> : null}

            <Button type="submit" size="lg" variant="champagne" disabled={busy} className="mt-1">
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
        </CardContent>
      </Card>
    </div>
  );
}
