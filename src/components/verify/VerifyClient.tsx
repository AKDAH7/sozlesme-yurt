"use client";

import { useMemo, useState } from "react";

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
  const [token, setToken] = useState(props.initialToken ?? "");
  const [referenceNo, setReferenceNo] = useState("");
  const [identityNo, setIdentityNo] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyOkResponse | null>(null);

  const pdfUrls = useMemo(() => {
    if (!result) return null;
    const base = `/api/documents/${encodeURIComponent(
      result.result.documentId
    )}/pdf/public?session=${encodeURIComponent(result.verifySession.token)}`;
    return {
      view: base,
      download: `${base}&download=1`,
    };
  }, [result]);

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
          birthDate: birthDate.trim(),
        }),
      });

      const data = (await res.json()) as VerifyResponse;
      if (!data.ok) {
        setError(data.message || "Bilgiler doğrulanamadı.");
        return;
      }

      setResult(data);
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Belge Doğrulama</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Belge doğrulamak için aşağıdaki bilgileri girin.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {props.initialToken ? null : (
          <div>
            <label className="mb-1 block text-sm font-medium">
              Token (opsiyonel)
            </label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="QR ile gelen token"
              autoComplete="off"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Referans No</label>
          <Input
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder="Örn: REF-2025-0001"
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            T.C. Kimlik No
          </label>
          <Input
            value={identityNo}
            onChange={(e) => setIdentityNo(e.target.value)}
            placeholder="11 hane"
            autoComplete="off"
            required
            inputMode="numeric"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Doğum Tarihi</label>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Doğrulanıyor..." : "Doğrula"}
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
              <span className="text-muted-foreground">Durum</span>
              <span className="font-medium">
                {result.result.status === "active" ? "Aktif" : "Pasif"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Referans</span>
              <span className="font-medium">{result.result.referenceNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ad Soyad</span>
              <span className="font-medium">{result.result.ownerFullName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Üniversite</span>
              <span className="font-medium">
                {result.result.universityName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PDF</span>
              <span className="font-medium">
                {result.result.pdfReady ? "Hazır" : "Hazır değil"}
              </span>
            </div>
          </div>

          {result.result.pdfReady && pdfUrls ? (
            <div className="mt-4 flex gap-2">
              <Button asChild className="flex-1">
                <a href={pdfUrls.view} target="_blank" rel="noreferrer">
                  Görüntüle
                </a>
              </Button>
              <Button asChild variant="secondary" className="flex-1">
                <a href={pdfUrls.download} rel="noreferrer">
                  İndir
                </a>
              </Button>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-muted-foreground">
            Oturum süresi:{" "}
            {new Date(result.verifySession.expiresAt).toLocaleString()}
          </p>
        </div>
      ) : null}
    </main>
  );
}
