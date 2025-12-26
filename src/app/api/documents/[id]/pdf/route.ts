import { requirePermission } from "@/lib/auth/permissions";
import { getDocumentPdfData } from "@/lib/db/queries/documents";
import { readPdfFromLocalStorage } from "@/lib/pdf/render";
import { getDocumentPdfBytes } from "@/lib/db/queries/documentPdfs";
import { insertDocumentAuditLog } from "@/lib/security/audit";
import type { AuditActionType } from "@/types/db";

export const runtime = "nodejs";

function getRequestMeta(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;
  return { ipAddress, userAgent };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requirePermission("documents:read");
    const { id } = await context.params;

    const doc = await getDocumentPdfData(id);
    if (!doc) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    if (!doc.pdf_url || !doc.pdf_hash) {
      return Response.json(
        { ok: false, error: "PDF not generated" },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";

    const isVercel = process.env.VERCEL === "1";

    let pdfBytes: Buffer | null | undefined;
    if (doc.pdf_storage_type === "db") {
      pdfBytes = (await getDocumentPdfBytes({ documentId: id }))?.pdfBytes;
    } else {
      try {
        pdfBytes = await readPdfFromLocalStorage({ documentId: id });
      } catch (e) {
        const anyErr = e as { code?: string } | null;
        // Vercel filesystem isn't persistent; documents marked as local can still exist.
        // If local storage misses, try DB as a fallback.
        if (isVercel && anyErr?.code === "ENOENT") {
          pdfBytes = (await getDocumentPdfBytes({ documentId: id }))?.pdfBytes;
        } else {
          throw e;
        }
      }
    }

    if (!pdfBytes) {
      return Response.json(
        { ok: false, error: "PDF not found" },
        { status: 404 }
      );
    }

    const body = new Uint8Array(pdfBytes);

    const meta = getRequestMeta(request);
    await insertDocumentAuditLog({
      documentId: id,
      actionType: (download
        ? "pdf_download"
        : "pdf_view") satisfies AuditActionType,
      actionByUserId: userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      detailsJson: {
        pdf_hash: doc.pdf_hash,
        mode: download ? "download" : "inline",
      },
    });

    const filename = `${doc.reference_no}.pdf`;

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `${
          download ? "attachment" : "inline"
        }; filename=\"${filename}\"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const anyErr = err as {
      status?: number;
      message?: string;
      code?: string;
    } | null;
    if (anyErr?.code === "ENOENT") {
      return Response.json(
        { ok: false, error: "PDF not found" },
        { status: 404 }
      );
    }
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to load PDF" },
      { status }
    );
  }
}
