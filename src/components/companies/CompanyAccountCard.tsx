"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function CompanyAccountCard(props: {
  companyId: string;
  companyName: string;
}) {
  const t = useTranslations("companies.account");

  const [existingUserId, setExistingUserId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingExisting(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/companies/${encodeURIComponent(props.companyId)}/account`,
          { cache: "no-store" }
        );

        const data = (await res.json().catch(() => null)) as
          | {
              ok: true;
              user: { id: string; fullName: string; email: string } | null;
            }
          | { ok: false; errorCode?: string }
          | null;

        if (cancelled) return;
        if (!data || data.ok !== true) return;

        if (data.user) {
          setExistingUserId(data.user.id);
          setEmail(data.user.email);
          setFullName(data.user.fullName);
        } else {
          setExistingUserId(null);
        }
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [props.companyId]);

  async function onSubmit() {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError(t("errors.emailRequired"));
      return;
    }

    const isEdit = Boolean(existingUserId);

    if (!isEdit) {
      if (!password.trim() || password.trim().length < 6) {
        setError(t("errors.passwordTooShort"));
        return;
      }
    } else {
      // On edit, password is optional (reset). If provided, validate.
      if (password.trim() && password.trim().length < 6) {
        setError(t("errors.passwordTooShort"));
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/companies/${encodeURIComponent(props.companyId)}/account`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password: password.trim() || undefined,
            full_name: fullName.trim() || props.companyName,
          }),
        }
      );

      const data = (await res.json().catch(() => null)) as
        | {
            ok: true;
            user?: {
              id: string;
              fullName: string;
              email: string;
            };
          }
        | { ok: false; errorCode?: string };

      if (!data || !("ok" in data) || data.ok !== true) {
        const code = (data as { errorCode?: string } | null)?.errorCode;
        if (code === "emailRequired") {
          setError(t("errors.emailRequired"));
          return;
        }
        if (code === "passwordTooShort") {
          setError(t("errors.passwordTooShort"));
          return;
        }
        if (code === "emailInUse") {
          setError(t("errors.emailInUse"));
          return;
        }
        if (code === "alreadyExists") {
          setError(t("errors.alreadyExists"));
          return;
        }
        setError(t("errors.actionFailed"));
        return;
      }

      if (data.user) {
        setExistingUserId(data.user.id);
        setEmail(data.user.email);
        setFullName(data.user.fullName);
      }

      setSuccess(isEdit ? t("success.updated") : t("success.created"));
      setPassword("");
    } catch {
      setError(t("errors.unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div>
        <div className="text-sm font-medium">{t("title")}</div>
        <div className="text-xs text-muted-foreground">{t("subtitle")}</div>
      </div>

      {loadingExisting ? (
        <div className="text-xs text-muted-foreground">{t("loading")}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.email")}
          </div>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.fullName")}
          </div>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={props.companyName}
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">
          {t("fields.password")}
        </div>
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          {success}
        </div>
      ) : null}

      <Button type="button" disabled={loading} onClick={onSubmit}>
        {existingUserId
          ? loading
            ? t("actions.saving")
            : t("actions.update")
          : loading
          ? t("actions.creating")
          : t("actions.create")}
      </Button>
    </div>
  );
}
