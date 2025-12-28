import { requirePermission } from "@/lib/auth/permissions";
import {
  getPricingSettings,
  updatePricingSettings,
} from "@/lib/db/queries/pricing";

export const runtime = "nodejs";

type PatchBody = {
  default_price_amount?: unknown;
  default_price_currency?: unknown;
};

export async function GET() {
  try {
    await requirePermission("companies:manage");
    const settings = await getPricingSettings();
    return Response.json({ ok: true, settings });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to load pricing" },
      { status }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePermission("companies:manage");

    const body = (await request.json().catch(() => null)) as PatchBody | null;
    const amount = Number(body?.default_price_amount);
    const currency =
      typeof body?.default_price_currency === "string"
        ? body.default_price_currency.trim()
        : "TRY";

    if (!Number.isFinite(amount) || amount < 0) {
      return Response.json(
        { ok: false, errorCode: "amountInvalid" },
        { status: 400 }
      );
    }

    const updated = await updatePricingSettings({
      defaultPriceAmount: amount,
      defaultPriceCurrency: currency || "TRY",
    });

    return Response.json({ ok: true, settings: updated });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to update pricing" },
      { status }
    );
  }
}
