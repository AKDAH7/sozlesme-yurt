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
  | "notifications:read"
  | "templates:manage"
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
    "notifications:read",
    "templates:manage",
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
    "notifications:read",
    "companies:manage",
  ]),
  accounting: new Set([
    "documents:read",
    "documents:add_payment",
    "notifications:read",
    "reports:view",
  ]),
  viewer: new Set(["documents:read", "notifications:read"]),
  company: new Set([
    "documents:read",
    "documents:create",
    "notifications:read",
    "reports:view",
  ]),
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  // Admin is an explicit superuser.
  if (role === "admin") return true;
  const permissions = ROLE_PERMISSIONS[role];
  return Boolean(permissions && permissions.has(permission));
}

export async function requirePermission(
  permission: Permission
): Promise<{ userId: string; role: UserRole; companyId?: string | null }> {
  const userId = await requireUserId();
  const user = await getUserByIdMinimal(userId);
  if (!user || !user.is_active) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  // Safety: if DB contains an unexpected role value, treat as unauthorized instead
  // of crashing during Server Component render.
  if (!ROLE_PERMISSIONS[user.role]) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  if (user.role === "admin") {
    return { userId, role: user.role, companyId: user.company_id ?? null };
  }
  if (!hasPermission(user.role, permission)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return { userId, role: user.role, companyId: user.company_id ?? null };
}

export async function requireRole(
  role: UserRole
): Promise<{ userId: string; role: UserRole; companyId?: string | null }> {
  const userId = await requireUserId();
  const user = await getUserByIdMinimal(userId);
  if (!user || !user.is_active) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  if (!ROLE_PERMISSIONS[user.role]) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  if (user.role !== role) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return { userId, role: user.role, companyId: user.company_id ?? null };
}
