import type { UserRole } from "@/types/db";
import { requireUserId } from "@/lib/auth/requireUser";
import { getUserByIdMinimal } from "@/lib/db/queries/users";

export type Permission =
  | "documents:read"
  | "documents:create"
  | "documents:update_tracking"
  | "documents:add_payment"
  | "documents:change_status"
  | "documents:generate_pdf"
  | "reports:view"
  | "users:manage"
  | "companies:manage";

const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  admin: new Set([
    "documents:read",
    "documents:create",
    "documents:update_tracking",
    "documents:add_payment",
    "documents:change_status",
    "documents:generate_pdf",
    "reports:view",
    "users:manage",
    "companies:manage",
  ]),
  staff: new Set([
    "documents:read",
    "documents:create",
    "documents:update_tracking",
    "documents:add_payment",
    "documents:generate_pdf",
    "companies:manage",
  ]),
  accounting: new Set([
    "documents:read",
    "documents:add_payment",
    "reports:view",
  ]),
  viewer: new Set(["documents:read"]),
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export async function requirePermission(
  permission: Permission
): Promise<{ userId: string; role: UserRole }> {
  const userId = await requireUserId();
  const user = await getUserByIdMinimal(userId);
  if (!user || !user.is_active) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  if (!hasPermission(user.role, permission)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return { userId, role: user.role };
}

export async function requireRole(
  role: UserRole
): Promise<{ userId: string; role: UserRole }> {
  const userId = await requireUserId();
  const user = await getUserByIdMinimal(userId);
  if (!user || !user.is_active) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  if (user.role !== role) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return { userId, role: user.role };
}
