import { requirePermission } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { createUser, listUsers } from "@/lib/db/queries/users";
import type { UserRole } from "@/types/db";

export const runtime = "nodejs";

type PostBody = {
  full_name?: unknown;
  email?: unknown;
  password?: unknown;
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

export async function GET() {
  try {
    await requirePermission("users:manage");
    const users = await listUsers();
    return Response.json({ ok: true, users });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to list users" },
      { status }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("users:manage");
    const body = (await request.json().catch(() => null)) as PostBody | null;

    const fullName =
      typeof body?.full_name === "string" ? body.full_name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password =
      typeof body?.password === "string" ? body.password.trim() : "";
    const role = isUserRole(body?.role) ? body.role : undefined;

    if (!fullName) {
      return Response.json(
        { ok: false, error: "full_name is required" },
        { status: 400 }
      );
    }
    if (!email || !email.includes("@")) {
      return Response.json(
        { ok: false, error: "email is invalid" },
        { status: 400 }
      );
    }
    if (!password || password.length < 8) {
      return Response.json(
        { ok: false, error: "password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const created = await createUser({
      fullName,
      email,
      passwordHash,
      role,
    });

    return Response.json({ ok: true, user: created });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to create user" },
      { status }
    );
  }
}
