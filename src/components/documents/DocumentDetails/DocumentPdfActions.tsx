"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

export function DocumentPdfActions(props: {
  documentId: string;
  hasPdf: boolean;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const viewHref = `/api/documents/${props.documentId}/pdf`;
  const downloadHref = `/api/documents/${props.documentId}/pdf?download=1`;

  async function generate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/documents/${props.documentId}/pdf/generate`,
        {
          method: "POST",
        }
      );
      const json = (await res.json().catch(() => null)) as
        | { ok: true; pdf_url: string; pdf_hash: string }
        | { ok: false; error?: string; errorCode?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        const code = json && "errorCode" in json ? json.errorCode : undefined;
        const message = json && "error" in json ? json.error ?? "" : "";
        throw new Error(code || message);
      }

      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "notFound") {
        setError(t("documents.details.pdfActions.errors.notFound"));
      } else if (msg === "forbidden") {
        setError(t("documents.details.pdfActions.errors.forbidden"));
      } else if (msg === "generateFailed") {
        setError(t("documents.details.pdfActions.errors.generateFailed"));
      } else {
        setError(
          msg || t("documents.details.pdfActions.errors.generateFailed")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
        >
          {props.hasPdf
            ? t("documents.details.pdfActions.regenerate")
            : t("documents.details.pdfActions.generate")}
        </Button>

        {props.hasPdf ? (
          <>
            <Button asChild variant="secondary">
              <a href={viewHref} target="_blank" rel="noreferrer">
                {t("documents.details.pdfActions.viewPdf")}
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href={downloadHref} target="_blank" rel="noreferrer">
                {t("documents.details.pdfActions.downloadPdf")}
              </a>
            </Button>
          </>
        ) : null}
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}
    </div>
  );
}
