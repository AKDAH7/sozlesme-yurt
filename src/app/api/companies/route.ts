import { requirePermission } from "@/lib/auth/permissions";
import { createCompany, listCompanies } from "@/lib/db/queries/companies";

export const runtime = "nodejs";

type PostBody = {
  company_name?: unknown;
  contact_name?: unknown;
  contact_phone?: unknown;
  contact_email?: unknown;
  notes?: unknown;
};

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
      { ok: false, error: anyErr?.message ?? "Failed to list companies" },
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
        { ok: false, error: "company_name is required" },
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

    const created = await createCompany({
      companyName,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      notes: notes || null,
    });

    return Response.json({ ok: true, id: created.id });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to create company" },
      { status }
    );
  }
}
