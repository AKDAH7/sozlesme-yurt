"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/types/db";

export type UserEditClientUser = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
};

const ROLES: UserRole[] = ["admin", "staff", "accounting", "viewer"];

export default function UserEditClient(props: { user: UserEditClientUser }) {
  const t = useTranslations("users.edit");
  const tRoles = useTranslations("users.roles");

  const [role, setRole] = useState<UserRole>(props.user.role);
  const [isActive, setIsActive] = useState<boolean>(props.user.is_active);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => role !== props.user.role || isActive !== props.user.is_active,
    [role, isActive, props.user.role, props.user.is_active]
  );

  async function onSave() {
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (role !== props.user.role) body.role = role;
      if (isActive !== props.user.is_active) body.is_active = isActive;

      const res = await fetch(
        `/api/users/${encodeURIComponent(props.user.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = (await res.json()) as {
        ok: boolean;
        errorCode?: string;
        error?: string;
      };
      if (!data.ok) {
        const code = data.errorCode;
        if (code === "noValidFields") {
          setError(t("errors.noValidFields"));
          return;
        }
        setError(t("errors.updateFailed"));
        return;
      }

      window.location.reload();
    } catch {
      setError(t("errors.unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.role")}
          </div>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [&>option]:bg-background [&>option]:text-foreground"
            value={role}
            disabled={loading}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tRoles(r)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.status")}
          </div>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [&>option]:bg-background [&>option]:text-foreground"
            value={isActive ? "active" : "inactive"}
            disabled={loading}
            onChange={(e) => setIsActive(e.target.value === "active")}
          >
            <option value="active">{t("status.active")}</option>
            <option value="inactive">{t("status.inactive")}</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 md:flex-row md:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => window.history.back()}
        >
          {t("actions.cancel")}
        </Button>
        <Button type="button" disabled={loading || !dirty} onClick={onSave}>
          {loading ? t("actions.saving") : t("actions.save")}
        </Button>
      </div>
    </div>
  );
}
