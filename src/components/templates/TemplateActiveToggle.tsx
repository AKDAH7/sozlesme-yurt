"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

export function TemplateActiveToggle(props: {
  templateId: string;
  isActive: boolean;
}) {
  const t = useTranslations("templates.list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onToggle() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/templates/${encodeURIComponent(props.templateId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ is_active: !props.isActive }),
        }
      );
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? t("errors.toggleFailed"));
        return;
      }

      window.location.reload();
    } catch {
      setError(t("errors.toggleFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onToggle}
        disabled={loading}
      >
        {loading
          ? t("actions.saving")
          : props.isActive
          ? t("actions.deactivate")
          : t("actions.activate")}
      </Button>
    </div>
  );
}
