import fs from "fs/promises";
import path from "path";

import { requirePermission } from "@/lib/auth/permissions";
import {
  getDocumentPdfData,
  updateDocumentPdfInfo,
} from "@/lib/db/queries/documents";
import { generateBarcodePngDataUrl } from "@/lib/pdf/barcode";
import { generateQrPngDataUrl } from "@/lib/pdf/qrcode";
import {
  renderHtmlToPdfBuffer,
  sha256Hex,
  writePdfToLocalStorage,
} from "@/lib/pdf/render";
import { buildVerificationPath, buildVerificationUrl } from "@/lib/pdf/tokens";
import { renderDefaultTemplateHtml } from "@/components/documents/DocumentPreview/templates/DefaultTemplate";

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

async function loadStampDataUrl(): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "src",
    "lib",
    "pdf",
    "assets",
    "stamp.png"
  );
  const bytes = await fs.readFile(filePath);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requirePermission("documents:generate_pdf");
    const { id } = await context.params;

    const doc = await getDocumentPdfData(id);
    if (!doc) {
      return Response.json(
        { ok: false, errorCode: "notFound", error: "Not found" },
        { status: 404 }
      );
    }

    const origin = new URL(request.url).origin;
    const verificationPath = buildVerificationPath(doc.token);
    const verificationUrl = buildVerificationUrl({ origin, token: doc.token });

    const [stampDataUrl, qrDataUrl, barcodeDataUrl] = await Promise.all([
      loadStampDataUrl(),
      generateQrPngDataUrl({ text: verificationUrl, size: 180 }),
      generateBarcodePngDataUrl({ text: doc.barcode_id, scale: 3, height: 12 }),
    ]);

    const requesterLabel =
      doc.requester_type === "company"
        ? doc.company_name ?? "Company"
        : doc.direct_customer_name ?? "Customer";

    const priceLabel = `${doc.price_amount} ${doc.price_currency}`;

    const html =
      "<!doctype html>" +
      renderDefaultTemplateHtml({
        referenceNo: doc.reference_no,
        barcodeId: doc.barcode_id,
        ownerFullName: doc.owner_full_name,
        ownerIdentityNo: doc.owner_identity_no,
        ownerBirthDate: doc.owner_birth_date,
        universityName: doc.university_name,
        dormName: doc.dorm_name,
        dormAddress: doc.dorm_address,
        issueDate: doc.issue_date,
        footerDatetime: new Date(doc.footer_datetime).toLocaleString(),
        requesterLabel,
        priceLabel,
        verificationUrl,
        verificationPath,
        qrDataUrl,
        barcodeDataUrl,
        stampDataUrl,
      });

    const pdfBuffer = await renderHtmlToPdfBuffer({ html });
    const pdfHash = sha256Hex(pdfBuffer);

    await writePdfToLocalStorage({ documentId: id, pdfBuffer });

    const meta = getRequestMeta(request);
    const pdfUrl = `/api/documents/${id}/pdf`;

    const updated = await updateDocumentPdfInfo({
      documentId: id,
      storageType: "local",
      pdfUrl,
      pdfHash,
      userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return Response.json({
      ok: true,
      pdf_url: updated.pdf_url,
      pdf_hash: updated.pdf_hash,
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    const errorCode =
      status === 401 || status === 403
        ? "forbidden"
        : status === 404
        ? "notFound"
        : "generateFailed";

    return Response.json(
      {
        ok: false,
        errorCode,
        error: anyErr?.message ?? "Failed to generate PDF",
      },
      { status }
    );
  }
}
