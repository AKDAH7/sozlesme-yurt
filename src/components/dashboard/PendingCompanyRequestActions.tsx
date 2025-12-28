"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

export function PendingCompanyRequestActions(props: {
  documentId: string;
  hasPdf: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.home");

  const [busy, setBusy] = React.useState<"pdf" | "approve" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function generatePdf() {
    setError(null);
    setBusy("pdf");
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(props.documentId)}/pdf/generate`,
        { method: "POST" }
      );
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: string; errorCode?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        const msg = json && "error" in json ? json.error ?? "" : "";
        const code = json && "errorCode" in json ? json.errorCode ?? "" : "";
        throw new Error(msg || code || "generateFailed");
      }

      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || t("requestsActions.errors.generic"));
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setError(null);
    setBusy("approve");
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(props.documentId)}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ doc_status: "active" }),
        }
      );
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: string; errorCode?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        const msg = json && "error" in json ? json.error ?? "" : "";
        const code = json && "errorCode" in json ? json.errorCode ?? "" : "";
        throw new Error(msg || code || "approveFailed");
      }

      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || t("requestsActions.errors.generic"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy !== null}
          onClick={() => void generatePdf()}
        >
          {busy === "pdf"
            ? t("requestsActions.generating")
            : props.hasPdf
            ? t("requestsActions.regeneratePdf")
            : t("requestsActions.generatePdf")}
        </Button>

        <Button
          type="button"
          size="sm"
          disabled={busy !== null || !props.hasPdf}
          onClick={() => void approve()}
        >
          {busy === "approve"
            ? t("requestsActions.approving")
            : t("requestsActions.approve")}
        </Button>
      </div>

      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  );
}
