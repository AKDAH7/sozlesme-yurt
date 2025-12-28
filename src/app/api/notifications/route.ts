import { requirePermission } from "@/lib/auth/permissions";
import { listNotificationsForViewer } from "@/lib/db/queries/notifications";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { role, companyId } = await requirePermission("notifications:read");
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "20");

    const data = await listNotificationsForViewer({
      role,
      companyId: companyId ?? null,
      limit: Number.isFinite(limit) ? limit : 20,
    });

    return Response.json({ ok: true, ...data });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    return Response.json(
      {
        ok: false,
        errorCode:
          status === 401 || status === 403 ? "forbidden" : "listFailed",
        error: anyErr?.message ?? "Failed to load notifications",
      },
      { status }
    );
  }
}
