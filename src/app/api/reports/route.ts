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
    const { role, companyId } = await requirePermission("reports:view");

    const url = new URL(request.url);
    const range = parseReportRange({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });

    const scoped =
      role === "company"
        ? { ...range, companyId: companyId ?? null }
        : { ...range, companyId: null };

    const [summary, paymentsByMethod, topCompanies] = await Promise.all([
      getReportsSummary(scoped),
      getPaymentsByMethod(scoped),
      getTopRequestingCompanies({ ...scoped, limit: 10 }),
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
