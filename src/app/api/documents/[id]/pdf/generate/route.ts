import fs from "fs/promises";
import path from "path";

import { requirePermission } from "@/lib/auth/permissions";
import {
  getDocumentPdfData,
  updateDocumentPdfInfo,
} from "@/lib/db/queries/documents";
import { createNotification } from "@/lib/db/queries/notifications";
import { generateBarcodePngDataUrl } from "@/lib/pdf/barcode";
import { generateQrPngDataUrl } from "@/lib/pdf/qrcode";
import {
  renderHtmlToPdfBuffer,
  sha256Hex,
  writePdfToLocalStorage,
} from "@/lib/pdf/render";
import { buildVerificationPath, buildVerificationUrl } from "@/lib/pdf/tokens";
import { renderDefaultTemplateHtml } from "@/components/documents/DocumentPreview/templates/DefaultTemplate";
import { getTemplateDetails } from "@/lib/db/queries/templates";
import { upsertDocumentPdf } from "@/lib/db/queries/documentPdfs";

export const runtime = "nodejs";
// PDF generation can take longer on serverless.
export const maxDuration = 60;

function formatDateDdMmYyyy(input: string): string {
  const s = (input ?? "").trim();
  if (!s) return "";

  // Handle plain date strings from Postgres (YYYY-MM-DD) without timezone shifts.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;

  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

function contentTypeForImageExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function inlineUploadedTemplateImages(params: {
  html: string;
  origin: string;
}): Promise<string> {
  // Puppeteer renders HTML from about:blank; root-relative URLs like `/api/...`
  // won't resolve. Also, server-side rendering won't have the user's cookies.
  // Inlining these specific images as data URLs makes PDF rendering reliable.
  const uploadDir = path.join(process.cwd(), "storage", "uploads", "templates");

  const srcRe = /\bsrc=("|')([^"']+)("|')/gi;
  const matches = Array.from(params.html.matchAll(srcRe));
  if (!matches.length) return params.html;

  const replacements = new Map<string, string>();

  for (const m of matches) {
    const quote1 = m[1] ?? '"';
    const rawSrc = m[2] ?? "";
    const quote2 = m[3] ?? quote1;

    if (!rawSrc) continue;
    if (rawSrc.startsWith("data:")) continue;

    let url: URL;
    try {
      url = new URL(rawSrc, params.origin);
    } catch {
      continue;
    }

    // Match both relative and absolute references to our upload endpoint.
    if (!url.pathname.startsWith("/api/uploads/templates/")) continue;

    const key = decodeURIComponent(
      url.pathname.replace("/api/uploads/templates/", "")
    ).trim();
    if (!key) continue;
    if (key.includes("..") || key.includes("/") || key.includes("\\")) continue;

    if (replacements.has(rawSrc)) continue;

    try {
      const filePath = path.join(uploadDir, key);
      const bytes = await fs.readFile(filePath);
      const ct = contentTypeForImageExt(path.extname(key));
      const dataUrl = `data:${ct};base64,${bytes.toString("base64")}`;
      replacements.set(rawSrc, `src=${quote1}${dataUrl}${quote2}`);
    } catch {
      // If missing/unreadable, keep original src; PDF will fall back to alt.
    }
  }

  if (!replacements.size) return params.html;

  // Replace only attribute values, preserving the rest of the HTML.
  let out = params.html;
  for (const [rawSrc, replacementAttr] of replacements.entries()) {
    out = out.replaceAll(
      new RegExp(
        `\\bsrc=("|')${rawSrc.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}("|')`,
        "g"
      ),
      replacementAttr
    );
  }
  return out;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function replacePlaceholders(params: {
  html: string;
  values: Record<string, string>;
}): string {
  return params.html.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_m, key) => {
    const value = params.values[key] ?? "";
    return escapeHtml(value);
  });
}

function applyCommonAliasValues(values: Record<string, unknown>): void {
  // Align with common alias keys used in templates and in the new-document flow.
  // Intentionally overwrites, so edited document fields always win.
  values.full_name = values.owner_full_name ?? "";
  values.identity_no = values.owner_identity_no ?? "";
  values.birth_date = values.owner_birth_date ?? "";
  values.university = values.university_name ?? "";
  values.accommodation = values.dorm_name ?? "";
  values.address = values.dorm_address ?? "";
  values.amount = values.price_amount ?? "";
  values.currency = values.price_currency ?? "";
  values.companyId = values.company_id ?? "";
  values.customer_name = values.direct_customer_name ?? "";
  values.customer_phone = values.direct_customer_phone ?? "";
  values.footerDateTime = values.footer_datetime ?? "";
  values.requesterType = values.requester_type ?? "";
}

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
  // Vercel/serverless bundles may not include source asset paths.
  // Try a couple of likely locations and fall back to a transparent pixel.
  const candidates = [
    path.join(process.cwd(), "public", "stamp.png"),
    path.join(process.cwd(), "public", "pdf", "stamp.png"),
    path.join(process.cwd(), "src", "lib", "pdf", "assets", "stamp.png"),
  ];

  for (const filePath of candidates) {
    try {
      const bytes = await fs.readFile(filePath);
      return `data:image/png;base64,${bytes.toString("base64")}`;
    } catch {
      // try next
    }
  }

  // 1x1 transparent PNG
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax2wGQAAAAASUVORK5CYII=";
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

    let html: string;
    let templateVersionUsed: number | undefined;

    if (doc.template_id) {
      const tpl = await getTemplateDetails({
        templateId: doc.template_id,
      });

      if (!tpl) {
        return Response.json(
          {
            ok: false,
            errorCode: "templateNotFound",
            error: "Template not found",
          },
          { status: 500 }
        );
      }

      templateVersionUsed = tpl.latest_version;

      const baseValues: Record<string, unknown> = {
        reference_no: doc.reference_no,
        barcode_id: doc.barcode_id,
        token: doc.token,
        owner_full_name: doc.owner_full_name,
        owner_identity_no: doc.owner_identity_no,
        owner_birth_date: formatDateDdMmYyyy(doc.owner_birth_date),
        university_name: doc.university_name,
        dorm_name: doc.dorm_name ?? "",
        dorm_address: doc.dorm_address ?? "",
        issue_date: formatDateDdMmYyyy(doc.issue_date),
        footer_datetime: formatDateDdMmYyyy(doc.footer_datetime),
        requester_type: doc.requester_type,
        company_id: doc.company_id,
        direct_customer_name: doc.direct_customer_name ?? "",
        direct_customer_phone: doc.direct_customer_phone ?? "",
        price_amount: doc.price_amount,
        price_currency: doc.price_currency,
        requester_label: requesterLabel,
        price_label: priceLabel,
        verification_url: verificationUrl,
        verification_path: verificationPath,
      };

      const systemValues: Record<string, unknown> = {
        stamp_data_url: stampDataUrl,
        qr_data_url: qrDataUrl,
        barcode_data_url: barcodeDataUrl,
      };

      // Important: template_values may contain copies of core fields (owner_full_name, etc.).
      // When a document is edited, those template_values can become stale.
      // Merge order ensures the latest DB document fields always win.
      const merged: Record<string, unknown> = {
        ...(doc.template_values ?? {}),
        ...baseValues,
        ...systemValues,
      };

      applyCommonAliasValues(merged);

      const values: Record<string, string> = {};
      for (const [k, v] of Object.entries(merged)) {
        const s = v === null || typeof v === "undefined" ? "" : String(v);
        values[k] = s;
        values[k.toUpperCase()] = s;
      }

      const filled = replacePlaceholders({ html: tpl.html_content, values });
      html = (filled.trim().startsWith("<!") ? "" : "<!doctype html>") + filled;
    } else {
      html =
        "<!doctype html>" +
        renderDefaultTemplateHtml({
          referenceNo: doc.reference_no,
          barcodeId: doc.barcode_id,
          ownerFullName: doc.owner_full_name,
          ownerIdentityNo: doc.owner_identity_no,
          ownerBirthDate: formatDateDdMmYyyy(doc.owner_birth_date),
          universityName: doc.university_name,
          dormName: doc.dorm_name,
          dormAddress: doc.dorm_address,
          issueDate: formatDateDdMmYyyy(doc.issue_date),
          footerDatetime: formatDateDdMmYyyy(doc.footer_datetime),
          requesterLabel,
          priceLabel,
          verificationUrl,
          verificationPath,
          qrDataUrl,
          barcodeDataUrl,
          stampDataUrl,
        });
    }

    html = await inlineUploadedTemplateImages({ html, origin });

    const pdfBuffer = await renderHtmlToPdfBuffer({ html });
    const pdfHash = sha256Hex(pdfBuffer);

    // Serverless deployments (Vercel) can't rely on local filesystem persistence.
    // Persist the PDF bytes in Postgres.
    const isVercel = process.env.VERCEL === "1";
    if (isVercel) {
      await upsertDocumentPdf({ documentId: id, pdfBytes: pdfBuffer, pdfHash });
    } else {
      await writePdfToLocalStorage({ documentId: id, pdfBuffer });
    }

    const meta = getRequestMeta(request);
    const pdfUrl = `/api/documents/${id}/pdf`;

    const updated = await updateDocumentPdfInfo({
      documentId: id,
      storageType: isVercel ? "db" : "local",
      pdfUrl,
      pdfHash,
      templateVersion: templateVersionUsed,
      userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    // Notify the requesting company that the PDF is ready.
    if (doc.requester_type === "company" && doc.company_id) {
      await createNotification({
        targetRole: "company",
        companyId: doc.company_id,
        title: "kind:pdf_generated",
        message: JSON.stringify({
          referenceNo: doc.reference_no,
        }),
        href: `/documents/${id}`,
        createdByUserId: userId,
      }).catch(() => undefined);
    }

    return Response.json({
      ok: true,
      pdf_url: updated.pdf_url,
      pdf_hash: updated.pdf_hash,
    });
  } catch (err) {
    const anyErr = err as {
      status?: number;
      message?: string;
      code?: string;
    } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    let errorCode: string =
      status === 401 || status === 403
        ? "forbidden"
        : status === 404
        ? "notFound"
        : "generateFailed";

    // Vercel-specific/common operational failures with actionable hints.
    const msg = (anyErr?.message ?? "").toLowerCase();
    if (status >= 500) {
      // Postgres: relation does not exist
      if (anyErr?.code === "42P01" || msg.includes("document_pdfs")) {
        errorCode = "migrationMissing";
        return Response.json(
          {
            ok: false,
            errorCode,
            error:
              "Production database is missing table document_pdfs. Run migrations (npm run migrate) against the same DATABASE_URL used by Vercel.",
          },
          { status: 500 }
        );
      }

      // Chromium / puppeteer launch issues
      if (
        msg.includes("failed to launch") ||
        msg.includes("executablepath") ||
        msg.includes("chromium")
      ) {
        errorCode = "chromiumFailed";
        const details = anyErr?.message ? ` Details: ${anyErr.message}` : "";
        return Response.json(
          {
            ok: false,
            errorCode,
            error:
              "Chromium failed to start on Vercel. Ensure the deployment includes puppeteer-core + @sparticuz/chromium and that the function has enough memory/time." +
              details,
            details: anyErr?.message ?? null,
          },
          { status: 500 }
        );
      }
    }

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
