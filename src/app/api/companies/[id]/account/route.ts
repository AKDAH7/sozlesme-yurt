import { requirePermission } from "@/lib/auth/permissions";
import { getCompanyById } from "@/lib/db/queries/companies";
import {
  createUser,
  getCompanyAccountByCompanyId,
  getUserByEmail,
  updateUserAccount,
} from "@/lib/db/queries/users";
import { hashPassword } from "@/lib/auth/password";

export const runtime = "nodejs";

type PostBody = {
  email?: unknown;
  password?: unknown;
  full_name?: unknown;
};

type PatchBody = {
  email?: unknown;
  password?: unknown;
  full_name?: unknown;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("companies:manage");
    const { id: companyId } = await context.params;

    const company = await getCompanyById(companyId);
    if (!company) {
      return Response.json(
        { ok: false, errorCode: "notFound", error: "Not found" },
        { status: 404 }
      );
    }

    const user = await getCompanyAccountByCompanyId(companyId);
    return Response.json({
      ok: true,
      user: user
        ? {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            isActive: user.is_active,
          }
        : null,
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      {
        ok: false,
        errorCode: "loadAccountFailed",
        error: anyErr?.message ?? "Failed to load company account",
      },
      { status }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("companies:manage");
    const { id: companyId } = await context.params;

    const company = await getCompanyById(companyId);
    if (!company) {
      return Response.json(
        { ok: false, errorCode: "notFound", error: "Not found" },
        { status: 404 }
      );
    }

    const existingCompanyAccount = await getCompanyAccountByCompanyId(
      companyId
    );
    if (existingCompanyAccount) {
      return Response.json(
        { ok: false, errorCode: "alreadyExists" },
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => null)) as PostBody | null;
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password =
      typeof body?.password === "string" ? body.password.trim() : "";
    const fullNameRaw =
      typeof body?.full_name === "string" ? body.full_name.trim() : "";

    if (!email) {
      return Response.json(
        { ok: false, errorCode: "emailRequired" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return Response.json(
        { ok: false, errorCode: "passwordTooShort" },
        { status: 400 }
      );
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return Response.json(
        { ok: false, errorCode: "emailInUse" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const created = await createUser({
      fullName: fullNameRaw || company.company_name,
      email,
      passwordHash,
      role: "company",
      companyId,
    });

    return Response.json({
      ok: true,
      user: {
        id: created.id,
        fullName: created.full_name,
        email: created.email,
        role: created.role,
        company_id: created.company_id,
      },
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      {
        ok: false,
        errorCode: "createAccountFailed",
        error: anyErr?.message ?? "Failed to create company account",
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
    await requirePermission("companies:manage");
    const { id: companyId } = await context.params;

    const company = await getCompanyById(companyId);
    if (!company) {
      return Response.json(
        { ok: false, errorCode: "notFound", error: "Not found" },
        { status: 404 }
      );
    }

    const existingCompanyAccount = await getCompanyAccountByCompanyId(
      companyId
    );
    if (!existingCompanyAccount) {
      return Response.json(
        { ok: false, errorCode: "notFound" },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as PatchBody | null;
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
    const passwordRaw =
      typeof body?.password === "string" ? body.password.trim() : "";
    const fullNameRaw =
      typeof body?.full_name === "string" ? body.full_name.trim() : "";

    const email = emailRaw ? emailRaw : null;
    const fullName = fullNameRaw ? fullNameRaw : null;

    if (email) {
      const existing = await getUserByEmail(email);
      if (existing && existing.id !== existingCompanyAccount.id) {
        return Response.json(
          { ok: false, errorCode: "emailInUse" },
          { status: 409 }
        );
      }
    }

    let passwordHash: string | null = null;
    if (passwordRaw) {
      if (passwordRaw.length < 6) {
        return Response.json(
          { ok: false, errorCode: "passwordTooShort" },
          { status: 400 }
        );
      }
      passwordHash = await hashPassword(passwordRaw);
    }

    const updated = await updateUserAccount({
      userId: existingCompanyAccount.id,
      email,
      fullName,
      passwordHash,
    });

    return Response.json({
      ok: true,
      user: {
        id: updated.id,
        fullName: updated.full_name,
        email: updated.email,
        isActive: updated.is_active,
      },
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      {
        ok: false,
        errorCode: "updateAccountFailed",
        error: anyErr?.message ?? "Failed to update company account",
      },
      { status }
    );
  }
}
