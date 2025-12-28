import { requirePermission } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import {
  createCompanyWithAccount,
  listCompanies,
} from "@/lib/db/queries/companies";
import { getUserByEmail } from "@/lib/db/queries/users";

export const runtime = "nodejs";

type PostBody = {
  company_name?: unknown;
  ref_code?: unknown;
  contact_name?: unknown;
  contact_phone?: unknown;
  contact_email?: unknown;
  notes?: unknown;
  account_email?: unknown;
  account_full_name?: unknown;
  account_password?: unknown;
};

function normalizeRefCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  if (!v) return null;
  if (!/^[A-Z]{2,4}$/.test(v)) {
    throw Object.assign(new Error("ref_code must be 2-4 letters (A-Z)"), {
      status: 400,
    });
  }
  return v;
}

export async function GET() {
  try {
    await requirePermission("documents:read");
    const companies = await listCompanies();
    return Response.json({ ok: true, companies });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      {
        ok: false,
        errorCode: "listFailed",
        error: anyErr?.message ?? "Failed to list companies",
      },
      { status }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("companies:manage");

    const body = (await request.json().catch(() => null)) as PostBody | null;
    const companyName =
      typeof body?.company_name === "string" ? body.company_name.trim() : "";
    if (!companyName) {
      return Response.json(
        { ok: false, errorCode: "companyNameRequired" },
        { status: 400 }
      );
    }

    const contactName =
      typeof body?.contact_name === "string" ? body.contact_name.trim() : "";
    const contactPhone =
      typeof body?.contact_phone === "string" ? body.contact_phone.trim() : "";
    const contactEmail =
      typeof body?.contact_email === "string" ? body.contact_email.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    const refCode = normalizeRefCode(body?.ref_code);

    const accountEmail =
      typeof body?.account_email === "string" ? body.account_email.trim() : "";
    const accountPassword =
      typeof body?.account_password === "string" ? body.account_password : "";
    const accountFullName =
      typeof body?.account_full_name === "string"
        ? body.account_full_name.trim()
        : "";

    if (!accountEmail) {
      return Response.json(
        { ok: false, errorCode: "emailRequired" },
        { status: 400 }
      );
    }

    if (!accountPassword || accountPassword.trim().length < 6) {
      return Response.json(
        { ok: false, errorCode: "passwordTooShort" },
        { status: 400 }
      );
    }

    const existing = await getUserByEmail(accountEmail);
    if (existing) {
      return Response.json(
        { ok: false, errorCode: "emailInUse" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(accountPassword.trim());

    const created = await createCompanyWithAccount({
      companyName,
      refCode,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      notes: notes || null,
      accountEmail,
      accountFullName: accountFullName || contactName || companyName,
      accountPasswordHash: passwordHash,
    });

    return Response.json({ ok: true, id: created.companyId });
  } catch (err) {
    const anyErr = err as {
      status?: number;
      message?: string;
      code?: string;
    } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      {
        ok: false,
        errorCode: "createFailed",
        error: anyErr?.message ?? "Failed to create company",
      },
      { status }
    );
  }
}
