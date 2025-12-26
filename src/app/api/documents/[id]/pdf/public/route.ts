import { NextResponse } from "next/server";

import { getVerifySessionDocument } from "@/lib/db/queries/verify";
import { getDocumentPdfData } from "@/lib/db/queries/documents";
import { getDocumentPdfBytes } from "@/lib/db/queries/documentPdfs";
import { readPdfFromLocalStorage } from "@/lib/pdf/render";

export const runtime = "nodejs";

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    return first || null;
  }
  return req.headers.get("x-real-ip");
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const ipAddress = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  const url = new URL(req.url);
  const sessionToken = url.searchParams.get("session");
  const download = url.searchParams.get("download");

  if (!sessionToken) {
    return jsonError(401, "Yetkisiz.");
  }

  const session = await getVerifySessionDocument({
    token: sessionToken,
    documentId: id,
    ipAddress,
    userAgent,
  });
  if (!session.ok) {
    return jsonError(401, "Yetkisiz.");
  }

  const doc = await getDocumentPdfData(id);
  if (!doc || !doc.pdf_hash || !doc.pdf_url) {
    return jsonError(404, "PDF bulunamadı.");
  }

  const isVercel = process.env.VERCEL === "1";

  const pdfBytes =
    doc.pdf_storage_type === "db"
      ? (await getDocumentPdfBytes({ documentId: id }))?.pdfBytes
      : await readPdfFromLocalStorage({ documentId: id }).catch(async () => {
          if (isVercel) {
            return (
              (await getDocumentPdfBytes({ documentId: id }))?.pdfBytes ?? null
            );
          }
          return null;
        });

  if (!pdfBytes) {
    return jsonError(404, "PDF bulunamadı.");
  }

  const body = new Uint8Array(pdfBytes);

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set(
    "Content-Disposition",
    `${download === "1" ? "attachment" : "inline"}; filename=belge-${id}.pdf`
  );

  return new Response(body, { status: 200, headers });
}
