import { requirePermission } from "@/lib/auth/permissions";
import { getCompanyById, updateCompany } from "@/lib/db/queries/companies";

export const runtime = "nodejs";

type PatchBody = {
  company_name?: unknown;
  contact_name?: unknown;
  contact_phone?: unknown;
  contact_email?: unknown;
  notes?: unknown;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("documents:read");
    const { id } = await context.params;
    const company = await getCompanyById(id);
    if (!company) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return Response.json({ ok: true, company });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to load company" },
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
    const { id } = await context.params;

    const body = (await request.json().catch(() => null)) as PatchBody | null;
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

    const updated = await updateCompany({
      id,
      input: {
        companyName,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        notes: notes || null,
      },
    });

    return Response.json({
      ok: true,
      id: updated.id,
      updated_at: updated.updated_at,
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to update company" },
      { status }
    );
  }
}
