import type { DocStatus } from "@/types/db";
import { requirePermission } from "@/lib/auth/permissions";
import { updateDocumentStatus } from "@/lib/db/queries/documents";

export const runtime = "nodejs";

type Body = {
  doc_status?: unknown;
};

function getRequestMeta(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;
  return { ipAddress, userAgent };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requirePermission("documents:change_status");
    const { id } = await context.params;

    const body = (await request.json().catch(() => null)) as Body | null;
    const docStatus = body?.doc_status;
    if (docStatus !== "active" && docStatus !== "inactive") {
      return Response.json(
        { ok: false, error: "doc_status must be active or inactive" },
        { status: 400 }
      );
    }

    const meta = getRequestMeta(request);
    const updated = await updateDocumentStatus({
      documentId: id,
      docStatus: docStatus as DocStatus,
      userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return Response.json({ ok: true, doc_status: updated.doc_status });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to update status" },
      { status }
    );
  }
}
