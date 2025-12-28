"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

export function TemplateDeleteButton(props: {
  templateId: string;
  templateName: string;
}) {
  const t = useTranslations("templates.list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);

    const ok = window.confirm(t("confirmDelete", { name: props.templateName }));
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/templates/${encodeURIComponent(props.templateId)}`,
        { method: "DELETE" }
      );

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        errorCode?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        if (data?.errorCode === "inUse") {
          setError(t("errors.deleteInUse"));
          return;
        }
        setError(data?.error ?? t("errors.deleteFailed"));
        return;
      }

      window.location.reload();
    } catch {
      setError(t("errors.deleteFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onDelete}
        disabled={loading}
      >
        {loading ? t("actions.deleting") : t("actions.delete")}
      </Button>
    </div>
  );
}
