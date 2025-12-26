import type { TrackingStatus } from "@/types/db";
import { requirePermission } from "@/lib/auth/permissions";
import {
  changeTrackingStatus,
  listTrackingHistory,
} from "@/lib/db/queries/documents";

export const runtime = "nodejs";

type Body = {
  to_status?: unknown;
  note?: unknown;
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

function isTrackingStatus(value: unknown): value is TrackingStatus {
  return (
    value === "created" ||
    value === "delivered_to_student" ||
    value === "delivered_to_agent" ||
    value === "shipped" ||
    value === "received" ||
    value === "cancelled"
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("documents:read");
    const { id } = await context.params;

    const history = await listTrackingHistory(id);
    return Response.json({ ok: true, history });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      {
        ok: false,
        error: anyErr?.message ?? "Failed to load tracking history",
      },
      { status }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requirePermission("documents:update_tracking");
    const { id } = await context.params;

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!isTrackingStatus(body?.to_status)) {
      return Response.json(
        { ok: false, error: "to_status is invalid" },
        { status: 400 }
      );
    }
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    const meta = getRequestMeta(request);

    const updated = await changeTrackingStatus({
      documentId: id,
      toStatus: body.to_status,
      note: note ? note : null,
      userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return Response.json({
      ok: true,
      tracking_status: updated.tracking_status,
      tracking_history_id: updated.historyId,
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to update tracking" },
      { status }
    );
  }
}
