import { requirePermission } from "@/lib/auth/permissions";
import {
  getUserByIdMinimal,
  setUserActive,
  updateUserRole,
} from "@/lib/db/queries/users";
import type { UserRole } from "@/types/db";

export const runtime = "nodejs";

type PatchBody = {
  is_active?: unknown;
  role?: unknown;
};

function isUserRole(value: unknown): value is UserRole {
  return (
    value === "admin" ||
    value === "staff" ||
    value === "accounting" ||
    value === "viewer"
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("users:manage");
    const { id } = await context.params;
    const user = await getUserByIdMinimal(id);
    if (!user) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return Response.json({ ok: true, user });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to load user" },
      { status }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("users:manage");
    const { id } = await context.params;

    const body = (await request.json().catch(() => null)) as PatchBody | null;

    const updates: Record<string, unknown> = {};

    if (typeof body?.is_active === "boolean") {
      const updated = await setUserActive({
        userId: id,
        isActive: body.is_active,
      });
      updates.is_active = updated.is_active;
      updates.updated_at = updated.updated_at;
    }

    if (isUserRole(body?.role)) {
      const updated = await updateUserRole({ userId: id, role: body.role });
      updates.role = updated.role;
      updates.updated_at = updated.updated_at;
    }

    if (!Object.keys(updates).length) {
      return Response.json(
        { ok: false, error: "No valid fields" },
        { status: 400 }
      );
    }

    return Response.json({ ok: true, id, ...updates });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to update user" },
      { status }
    );
  }
}
