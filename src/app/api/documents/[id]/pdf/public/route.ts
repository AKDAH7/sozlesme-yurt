import { NextResponse } from "next/server";

import { getVerifySessionDocument } from "@/lib/db/queries/verify";

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

  // Reuse the existing authenticated endpoint implementation by proxying it isn't possible server-side,
  // so we redirect to a signed-less internal fetch is not desired.
  // Instead, we serve the PDF file directly from storage just like the existing endpoint.
  // This file path must match how PDFs are stored in generate route: storage/pdfs/<id>.pdf

  const fs = await import("fs/promises");
  const path = await import("path");

  const filePath = path.join(process.cwd(), "storage", "pdfs", `${id}.pdf`);

  let pdf: Buffer;
  try {
    pdf = await fs.readFile(filePath);
  } catch {
    return jsonError(404, "PDF bulunamadı.");
  }

  const body = new Uint8Array(pdf);

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set(
    "Content-Disposition",
    `${download === "1" ? "attachment" : "inline"}; filename=belge-${id}.pdf`
  );

  return new Response(body, { status: 200, headers });
}
