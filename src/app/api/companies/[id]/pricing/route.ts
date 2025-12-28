import { requirePermission } from "@/lib/auth/permissions";
import { getCompanyById } from "@/lib/db/queries/companies";
import {
  deleteCompanyTemplatePrice,
  listCompanyTemplatePrices,
  upsertCompanyTemplatePrice,
} from "@/lib/db/queries/pricing";

export const runtime = "nodejs";

type PostBody = {
  template_id?: unknown;
  price_amount?: unknown;
  price_currency?: unknown;
};

type DeleteBody = {
  template_id?: unknown;
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
        { ok: false, errorCode: "notFound" },
        { status: 404 }
      );
    }

    const rows = await listCompanyTemplatePrices({ companyId });
    return Response.json({ ok: true, rows });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      {
        ok: false,
        errorCode: "loadFailed",
        error: anyErr?.message ?? "Failed to load pricing",
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
        { ok: false, errorCode: "notFound" },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as PostBody | null;
    const templateId =
      typeof body?.template_id === "string" ? body.template_id.trim() : "";
    const amount = Number(body?.price_amount);
    const currency =
      typeof body?.price_currency === "string"
        ? body.price_currency.trim()
        : "TRY";

    if (!templateId) {
      return Response.json(
        { ok: false, errorCode: "templateRequired" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount < 0) {
      return Response.json(
        { ok: false, errorCode: "amountInvalid" },
        { status: 400 }
      );
    }

    const row = await upsertCompanyTemplatePrice({
      companyId,
      templateId,
      priceAmount: amount,
      priceCurrency: currency || "TRY",
    });

    return Response.json({ ok: true, row });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      {
        ok: false,
        errorCode: "saveFailed",
        error: anyErr?.message ?? "Failed to save price",
      },
      { status }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("companies:manage");
    const { id: companyId } = await context.params;

    const company = await getCompanyById(companyId);
    if (!company) {
      return Response.json(
        { ok: false, errorCode: "notFound" },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as DeleteBody | null;
    const templateId =
      typeof body?.template_id === "string" ? body.template_id.trim() : "";

    if (!templateId) {
      return Response.json(
        { ok: false, errorCode: "templateRequired" },
        { status: 400 }
      );
    }

    await deleteCompanyTemplatePrice({ companyId, templateId });
    return Response.json({ ok: true });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      {
        ok: false,
        errorCode: "deleteFailed",
        error: anyErr?.message ?? "Failed to delete price",
      },
      { status }
    );
  }
}
