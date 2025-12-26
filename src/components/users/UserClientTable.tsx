"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/types/db";

export type UserRowUi = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

const ROLES: UserRole[] = ["admin", "staff", "accounting", "viewer"];

export default function UserClientTable(props: { users: UserRowUi[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchUser(id: string, body: unknown) {
    setError(null);
    setLoadingId(id);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "İşlem başarısız.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Bir hata oluştu.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3">Ad Soyad</th>
              <th className="px-4 py-3">E-posta</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {props.users.length ? (
              props.users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="h-9 rounded-md border border-input bg-transparent px-2"
                      value={u.role}
                      disabled={loadingId === u.id}
                      onChange={(e) =>
                        patchUser(u.id, { role: e.target.value as UserRole })
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.is_active
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {u.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={loadingId === u.id}
                      onClick={() =>
                        patchUser(u.id, { is_active: !u.is_active })
                      }
                    >
                      {u.is_active ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
