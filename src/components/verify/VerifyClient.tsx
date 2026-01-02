"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type VerifyOkResponse = {
  ok: true;
  result: {
    documentId: string;
    status: "active" | "inactive";
    referenceNo: string;
    ownerFullName: string;
    universityName: string;
    pdfReady: boolean;
  };
  verifySession: {
    token: string;
    expiresAt: string;
  };
};

type VerifyFailResponse = {
  ok: false;
  message: string;
};

type VerifyResponse = VerifyOkResponse | VerifyFailResponse;

export default function VerifyClient(props: { initialToken?: string }) {
  const tVerify = useTranslations("verify");
  const tStatus = useTranslations("status");
  const tActions = useTranslations("actions");

  const [token] = useState(props.initialToken ?? "");
  const [referenceNo, setReferenceNo] = useState("");
  const [identityNo, setIdentityNo] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyOkResponse | null>(null);

  useEffect(() => {
    if (!props.initialToken) return;
    let cancelled = false;

    async function prefill() {
      try {
        const res = await fetch(
          `/api/documents/verify/prefill?token=${encodeURIComponent(
            props.initialToken ?? ""
          )}`,
          { cache: "no-store" }
        );
        const json = (await res.json().catch(() => null)) as
          | {
              ok: true;
              referenceNo: string;
              identityNo: string;
            }
          | { ok: false; error?: string }
          | null;
        if (!res.ok || !json || json.ok !== true) return;
        if (cancelled) return;
        setReferenceNo((v) => v || json.referenceNo);
        setIdentityNo((v) => v || json.identityNo);
      } catch {
        // ignore
      }
    }

    void prefill();
    return () => {
      cancelled = true;
    };
  }, [props.initialToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    setLoading(true);
    try {
      const res = await fetch("/api/documents/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: token.trim() ? token.trim() : undefined,
          referenceNo: referenceNo.trim(),
          identityNo: identityNo.trim(),
        }),
      });

      const data = (await res.json()) as VerifyResponse;
      if (!data.ok) {
        setError(data.message || tVerify("errors.verifyFailed"));
        return;
      }

      setResult(data);
    } catch {
      setError(tVerify("errors.unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {tVerify("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {tVerify("subtitle")}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {tVerify("referenceNoLabel")}
          </label>
          <Input
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder={tVerify("referenceNoPlaceholder")}
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            {tVerify("identityNoLabel")}
          </label>
          <Input
            value={identityNo}
            onChange={(e) => setIdentityNo(e.target.value)}
            placeholder={tVerify("identityNoPlaceholder")}
            autoComplete="off"
            required
            inputMode="numeric"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? tActions("verifying") : tActions("verify")}
        </Button>
      </form>

      {error ? (
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 rounded-md border p-4">
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {tVerify("result.status")}
              </span>
              <span className="font-medium">
                {tStatus(`document.${result.result.status}`)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {tVerify("result.reference")}
              </span>
              <span className="font-medium">{result.result.referenceNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {tVerify("result.fullName")}
              </span>
              <span className="font-medium">{result.result.ownerFullName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {tVerify("result.university")}
              </span>
              <span className="font-medium">
                {result.result.universityName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {tVerify("result.pdf")}
              </span>
              <span className="font-medium">
                {result.result.pdfReady
                  ? tStatus("pdf.ready")
                  : tStatus("pdf.notReady")}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
