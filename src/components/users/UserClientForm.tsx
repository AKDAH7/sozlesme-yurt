"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { UserRole } from "@/types/db";

const ROLES: UserRole[] = ["admin", "staff", "accounting", "viewer"];

export default function UserClientForm() {
  const t = useTranslations("users.form");
  const tRoles = useTranslations("users.roles");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        errorCode?: string;
        error?: string;
      };
      if (!data.ok) {
        const code = data.errorCode;
        if (code === "fullNameRequired") {
          setError(t("errors.fullNameRequired"));
          return;
        }
        if (code === "emailInvalid") {
          setError(t("errors.emailInvalid"));
          return;
        }
        if (code === "passwordTooShort") {
          setError(t("errors.passwordTooShort"));
          return;
        }
        if (code === "createFailed") {
          setError(t("errors.createFailed"));
          return;
        }

        setError(t("errors.createFailed"));
        return;
      }
      window.location.href = "/users";
    } catch {
      setError(t("errors.unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <div>
        <div className="text-xs text-muted-foreground">
          {t("fields.fullName")}
        </div>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div>
        <div className="text-xs text-muted-foreground">{t("fields.email")}</div>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <div className="text-xs text-muted-foreground">
          {t("fields.password")}
        </div>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="mt-1 text-xs text-muted-foreground">
          {t("passwordHint")}
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">{t("fields.role")}</div>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [&>option]:bg-background [&>option]:text-foreground"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {tRoles(r)}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? t("actions.creating") : t("actions.create")}
      </Button>
    </form>
  );
}
