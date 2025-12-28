import { requirePermission } from "@/lib/auth/permissions";
import { markNotificationRead } from "@/lib/db/queries/notifications";

export const runtime = "nodejs";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { role, companyId } = await requirePermission("notifications:read");
    const { id } = await context.params;

    const updated = await markNotificationRead({
      id,
      role,
      companyId: companyId ?? null,
    });

    return Response.json({ ok: true, notification: updated });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    return Response.json(
      {
        ok: false,
        errorCode:
          status === 401 || status === 403
            ? "forbidden"
            : status === 404
            ? "notFound"
            : "updateFailed",
        error: anyErr?.message ?? "Failed to mark as read",
      },
      { status }
    );
  }
}
