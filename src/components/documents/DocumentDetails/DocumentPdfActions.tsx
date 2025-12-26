"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

export function DocumentPdfActions(props: {
  documentId: string;
  hasPdf: boolean;
}) {
  const router = useRouter();
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
        | { ok: false; error?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        throw new Error(json && "error" in json ? json.error ?? "" : "");
      }

      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || "Failed to generate PDF");
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
          {props.hasPdf ? "Regenerate PDF" : "Generate PDF"}
        </Button>

        {props.hasPdf ? (
          <>
            <Button asChild variant="secondary">
              <a href={viewHref} target="_blank" rel="noreferrer">
                View PDF
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href={downloadHref} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </Button>
          </>
        ) : null}
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}
    </div>
  );
}
