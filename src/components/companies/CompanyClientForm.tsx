"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type CompanyFormValues = {
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  notes: string;
};

export default function CompanyClientForm(props: {
  mode: "create" | "edit";
  companyId?: string;
  initialValues?: Partial<CompanyFormValues>;
}) {
  const [values, setValues] = useState<CompanyFormValues>({
    company_name: props.initialValues?.company_name ?? "",
    contact_name: props.initialValues?.contact_name ?? "",
    contact_phone: props.initialValues?.contact_phone ?? "",
    contact_email: props.initialValues?.contact_email ?? "",
    notes: props.initialValues?.notes ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.company_name.trim()) {
      setError("Şirket adı zorunludur.");
      return;
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
          contact_name: values.contact_name.trim(),
          contact_phone: values.contact_phone.trim(),
          contact_email: values.contact_email.trim(),
          notes: values.notes.trim(),
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        id?: string;
      };
      if (!data.ok) {
        setError(data.error ?? "İşlem başarısız.");
        return;
      }

      const id = props.mode === "create" ? data.id : props.companyId;
      if (id) {
        window.location.href = `/companies/${id}/edit`;
      } else {
        window.location.href = "/companies";
      }
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
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
        <div className="text-xs text-muted-foreground">Şirket Adı</div>
        <Input
          value={values.company_name}
          onChange={(e) =>
            setValues((v) => ({ ...v, company_name: e.target.value }))
          }
          placeholder="Şirket adı"
          required
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">İletişim Kişisi</div>
          <Input
            value={values.contact_name}
            onChange={(e) =>
              setValues((v) => ({ ...v, contact_name: e.target.value }))
            }
            placeholder="Ad Soyad"
          />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Telefon</div>
          <Input
            value={values.contact_phone}
            onChange={(e) =>
              setValues((v) => ({ ...v, contact_phone: e.target.value }))
            }
            placeholder="Telefon"
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">E-posta</div>
        <Input
          value={values.contact_email}
          onChange={(e) =>
            setValues((v) => ({ ...v, contact_email: e.target.value }))
          }
          placeholder="email@company.com"
        />
      </div>

      <div>
        <div className="text-xs text-muted-foreground">Not</div>
        <Input
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          placeholder="Notlar"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading
          ? "Kaydediliyor..."
          : props.mode === "create"
          ? "Oluştur"
          : "Güncelle"}
      </Button>
    </form>
  );
}
