import { requirePermission } from "@/lib/auth/permissions";
import {
  getAccountingSummaryForDocuments,
  isUuid,
} from "@/lib/db/queries/accounting";

export const runtime = "nodejs";

type PostBody = {
  documentIds?: unknown;
};

export async function POST(request: Request) {
  try {
    await requirePermission("accounting:view");

    const body = (await request.json().catch(() => null)) as PostBody | null;
    const idsRaw = body?.documentIds;

    const documentIds = Array.isArray(idsRaw)
      ? idsRaw.filter((v): v is string => typeof v === "string")
      : [];

    if (documentIds.length === 0) {
      return Response.json({
        ok: true,
        summary: await getAccountingSummaryForDocuments({ documentIds: [] }),
      });
    }

    if (documentIds.length > 500) {
      return Response.json(
        { ok: false, error: "Too many documents" },
        { status: 400 }
      );
    }

    if (!documentIds.every(isUuid)) {
      return Response.json(
        { ok: false, error: "Invalid document id" },
        { status: 400 }
      );
    }

    const summary = await getAccountingSummaryForDocuments({ documentIds });

    return Response.json({ ok: true, summary });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to calculate summary" },
      { status }
    );
  }
}
