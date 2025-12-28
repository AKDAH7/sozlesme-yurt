"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type CompanyFormValues = {
  company_name: string;
  ref_code: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  notes: string;
  account_email: string;
  account_full_name: string;
  account_password: string;
};

export default function CompanyClientForm(props: {
  mode: "create" | "edit";
  companyId?: string;
  initialValues?: Partial<CompanyFormValues>;
}) {
  const t = useTranslations("companies.form");
  const tAccount = useTranslations("companies.account");

  const [values, setValues] = useState<CompanyFormValues>({
    company_name: props.initialValues?.company_name ?? "",
    ref_code: props.initialValues?.ref_code ?? "",
    contact_name: props.initialValues?.contact_name ?? "",
    contact_phone: props.initialValues?.contact_phone ?? "",
    contact_email: props.initialValues?.contact_email ?? "",
    notes: props.initialValues?.notes ?? "",
    // Only used on create. Keep these empty for edit mode.
    account_email: props.initialValues?.account_email ?? "",
    account_full_name: props.initialValues?.account_full_name ?? "",
    account_password: props.initialValues?.account_password ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.company_name.trim()) {
      setError(t("errors.companyNameRequired"));
      return;
    }

    if (props.mode === "create") {
      if (!values.account_email.trim()) {
        setError(tAccount("errors.emailRequired"));
        return;
      }
      if (
        !values.account_password.trim() ||
        values.account_password.length < 6
      ) {
        setError(tAccount("errors.passwordTooShort"));
        return;
      }
    }

    setLoading(true);
    try {
      const url =
        props.mode === "create"
          ? "/api/companies"
          : `/api/companies/${encodeURIComponent(props.companyId ?? "")}`;
      const method = props.mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          company_name: values.company_name.trim(),
          ref_code: values.ref_code.trim(),
          contact_name: values.contact_name.trim(),
          contact_phone: values.contact_phone.trim(),
          contact_email: values.contact_email.trim(),
          notes: values.notes.trim(),
          ...(props.mode === "create"
            ? {
                account_email: values.account_email.trim(),
                account_full_name: (values.account_full_name.trim() ||
                  values.contact_name.trim() ||
                  values.company_name.trim()) as string,
                account_password: values.account_password,
              }
            : {}),
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        errorCode?: string;
        error?: string;
        id?: string;
      };
      if (!data.ok) {
        const code = data.errorCode;
        if (code === "companyNameRequired") {
          setError(t("errors.companyNameRequired"));
          return;
        }
        if (code === "emailRequired") {
          setError(tAccount("errors.emailRequired"));
          return;
        }
        if (code === "passwordTooShort") {
          setError(tAccount("errors.passwordTooShort"));
          return;
        }
        if (code === "emailInUse") {
          setError(tAccount("errors.emailInUse"));
          return;
        }
        if (code === "createFailed" || code === "updateFailed") {
          setError(t("errors.actionFailed"));
          return;
        }

        setError(t("errors.actionFailed"));
        return;
      }

      const id = props.mode === "create" ? data.id : props.companyId;
      if (id) {
        window.location.href = `/companies/${id}/edit`;
      } else {
        window.location.href = "/companies";
      }
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
          {t("fields.companyName")}
        </div>
        <Input
          value={values.company_name}
          onChange={(e) =>
            setValues((v) => ({ ...v, company_name: e.target.value }))
          }
          placeholder={t("placeholders.companyName")}
          required
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.contactName")}
          </div>
          <Input
            value={values.contact_name}
            onChange={(e) =>
              setValues((v) => ({ ...v, contact_name: e.target.value }))
            }
            placeholder={t("placeholders.contactName")}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("fields.refCode")}
            </label>
            <Input
              value={values.ref_code}
              onChange={(e) =>
                setValues((p) => ({ ...p, ref_code: e.target.value }))
              }
              placeholder={t("placeholders.refCode")}
              autoComplete="off"
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {t("hints.refCode")}
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.contactPhone")}
          </div>
          <Input
            value={values.contact_phone}
            onChange={(e) =>
              setValues((v) => ({ ...v, contact_phone: e.target.value }))
            }
            placeholder={t("placeholders.contactPhone")}
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">
          {t("fields.contactEmail")}
        </div>
        <Input
          value={values.contact_email}
          onChange={(e) =>
            setValues((v) => ({ ...v, contact_email: e.target.value }))
          }
          placeholder={t("placeholders.contactEmail")}
        />
      </div>

      {props.mode === "create" ? (
        <div className="space-y-3 rounded-md border border-border bg-background p-3">
          <div>
            <div className="text-sm font-medium">{tAccount("title")}</div>
            <div className="text-xs text-muted-foreground">
              {tAccount("subtitle")}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">
              {tAccount("fields.email")}
            </div>
            <Input
              value={values.account_email}
              onChange={(e) =>
                setValues((v) => ({ ...v, account_email: e.target.value }))
              }
              placeholder={
                values.contact_email || t("placeholders.contactEmail")
              }
              required
            />
          </div>

          <div>
            <div className="text-xs text-muted-foreground">
              {tAccount("fields.fullName")}
            </div>
            <Input
              value={values.account_full_name}
              onChange={(e) =>
                setValues((v) => ({ ...v, account_full_name: e.target.value }))
              }
              placeholder={values.contact_name || values.company_name}
            />
          </div>

          <div>
            <div className="text-xs text-muted-foreground">
              {tAccount("fields.password")}
            </div>
            <Input
              value={values.account_password}
              onChange={(e) =>
                setValues((v) => ({ ...v, account_password: e.target.value }))
              }
              type="password"
              required
            />
          </div>
        </div>
      ) : null}

      <div>
        <div className="text-xs text-muted-foreground">{t("fields.notes")}</div>
        <Input
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          placeholder={t("placeholders.notes")}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading
          ? t("actions.saving")
          : props.mode === "create"
          ? t("actions.create")
          : t("actions.update")}
      </Button>
    </form>
  );
}
