import {
  getPaymentsByMethod,
  getReportsSummary,
  getTopRequestingCompanies,
  parseReportRange,
} from "@/lib/db/queries/reports";
import { requirePermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePermission("reports:view");

    const url = new URL(request.url);
    const range = parseReportRange({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });

    const [summary, paymentsByMethod, topCompanies] = await Promise.all([
      getReportsSummary(range),
      getPaymentsByMethod(range),
      getTopRequestingCompanies({ ...range, limit: 10 }),
    ]);

    return Response.json({
      ok: true,
      range,
      summary,
      paymentsByMethod,
      topCompanies,
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to load reports" },
      { status }
    );
  }
}
