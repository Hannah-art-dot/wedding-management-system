"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Shield } from "lucide-react";
import { BackButton } from "@/components/layout/back-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { UserRole, UserStatus } from "@/lib/enums";

type ManagedUser = {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
  checkIns?: number;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  CHECKIN_STAFF: "Check-in staff",
  MANAGER: "Manager",
  VIEWER: "Viewer",
};

export function UserManagementPanel() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CHECKIN_STAFF">("CHECKIN_STAFF");

  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    void fetch("/api/users")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data.success) throw new Error(data.error ?? "Failed");
        setUsers(data.users);
        setError(null);
      })
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password, role }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not create user.");
        return;
      }
      setMessage(`Created ${data.user.username}.`);
      setName("");
      setUsername("");
      setPassword("");
      load();
    } catch {
      setError("Network error while creating user.");
    } finally {
      setBusy(false);
    }
  }

  async function patchUser(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not update user.");
        return;
      }
      setMessage(data.message ?? "Updated.");
      setResetId(null);
      setResetPassword("");
      load();
    } catch {
      setError("Network error while updating user.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:py-10">
      <BackButton href="/" />

      <div className="space-y-6">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Add account</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void onCreate(e)}>
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "ADMIN" | "CHECKIN_STAFF")}
                >
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.CHECKIN_STAFF}>Check-in staff</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="champagne" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Create user
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error ? <Alert variant="destructive">{error}</Alert> : null}
        {message ? <Alert variant="success">{message}</Alert> : null}

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </p>
            ) : null}
            {!loading && users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found.</p>
            ) : null}
            {users.map((u) => (
              <div
                key={u.id}
                className="space-y-3 rounded-xl border border-border/70 bg-background/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-xl font-semibold">{u.name}</p>
                    <p className="text-sm text-muted-foreground">@{u.username}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={u.role === UserRole.ADMIN ? "champagne" : "secondary"}>
                      <Shield className="mr-1 size-3" />
                      {ROLE_LABEL[u.role] ?? u.role}
                    </Badge>
                    <Badge variant={u.status === UserStatus.ACTIVE ? "success" : "muted"}>
                      {u.status}
                    </Badge>
                    <Badge variant="outline">Check-ins: {u.checkIns ?? 0}</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {u.status === UserStatus.ACTIVE ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void patchUser(u.id, { status: UserStatus.DISABLED })}
                    >
                      Disable
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void patchUser(u.id, { status: UserStatus.ACTIVE })}
                    >
                      Enable
                    </Button>
                  )}
                  {u.role === UserRole.ADMIN ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void patchUser(u.id, { role: UserRole.CHECKIN_STAFF })
                      }
                    >
                      Make check-in staff
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void patchUser(u.id, { role: UserRole.ADMIN })}
                    >
                      Make admin
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setResetId(u.id);
                      setResetPassword("");
                    }}
                  >
                    Reset password
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy}
                    onClick={() => void patchUser(u.id, { status: UserStatus.DELETED })}
                  >
                    Delete
                  </Button>
                </div>

                {resetId === u.id ? (
                  <form
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void patchUser(u.id, { password: resetPassword });
                    }}
                  >
                    <div className="flex-1 space-y-1.5">
                      <Label>New password for @{u.username}</Label>
                      <Input
                        type="password"
                        required
                        minLength={4}
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="champagne" size="sm" disabled={busy}>
                      Save password
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setResetId(null)}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
