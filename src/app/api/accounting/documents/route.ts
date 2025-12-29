import type { DocStatus, RequesterType, TrackingStatus } from "@/types/db";
import { requirePermission } from "@/lib/auth/permissions";
import { listDocuments } from "@/lib/db/queries/documents";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePermission("accounting:view");

    const url = new URL(request.url);

    const page = Math.max(
      1,
      Math.floor(Number(url.searchParams.get("page") ?? "1") || 1)
    );
    const pageSize = Math.min(
      50,
      Math.max(
        1,
        Math.floor(Number(url.searchParams.get("pageSize") ?? "20") || 20)
      )
    );

    const companyId = (url.searchParams.get("company_id") ?? "").trim();
    const from = (url.searchParams.get("from") ?? "").trim() || null;
    const to = (url.searchParams.get("to") ?? "").trim() || null;

    const paymentGroupParam = (url.searchParams.get("payment_group") ?? "")
      .trim()
      .toLowerCase();
    const paymentGroup: "" | "paid" | "unpaid" =
      paymentGroupParam === "paid" || paymentGroupParam === "unpaid"
        ? (paymentGroupParam as "paid" | "unpaid")
        : "";

    // Accounting table is a constrained view: no free-text search, no status/requester filters.
    const q = "";
    const status: DocStatus | "" = "";
    const trackingStatus: TrackingStatus | "" = "";
    const requesterType: RequesterType | "" = "";

    const docs = await listDocuments({
      page,
      pageSize,
      q,
      status,
      trackingStatus,
      paymentGroup,
      requesterType,
      companyId,
      from,
      to,
      sortDir: "desc",
    });

    return Response.json({
      ok: true,
      page,
      pageSize,
      total: docs.total,
      rows: docs.rows,
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    const errorCode =
      status === 401 || status === 403
        ? "forbidden"
        : "listAccountingDocumentsFailed";

    return Response.json(
      {
        ok: false,
        errorCode,
        error: anyErr?.message ?? "Failed to load documents",
      },
      { status }
    );
  }
}
