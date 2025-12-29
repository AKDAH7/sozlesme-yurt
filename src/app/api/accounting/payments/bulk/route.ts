import type { PaymentMethod } from "@/types/db";
import { requirePermission } from "@/lib/auth/permissions";
import { addPaymentAndUpdateStatus } from "@/lib/db/queries/documents";

export const runtime = "nodejs";

type PostBody = {
  documentIds?: unknown;
  received_amount?: unknown;
  currency?: unknown;
  method?: unknown;
  payment_date?: unknown;
  receipt_no?: unknown;
  note?: unknown;
};

function getRequestMeta(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;
  return { ipAddress, userAgent };
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    value === "cash" ||
    value === "bank_transfer" ||
    value === "card" ||
    value === "other"
  );
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(req: Request) {
  try {
    const { userId } = await requirePermission("documents:add_payment");

    const body = (await req.json().catch(() => null)) as PostBody | null;

    const documentIds = Array.isArray(body?.documentIds)
      ? body!.documentIds.filter((id): id is string => typeof id === "string")
      : [];

    if (documentIds.length < 1 || documentIds.length > 500) {
      return Response.json(
        {
          ok: false,
          errorCode: "invalidDocumentIds",
          error: "documentIds must contain 1..500 ids",
        },
        { status: 400 }
      );
    }

    if (!documentIds.every((id) => isValidUuid(id))) {
      return Response.json(
        {
          ok: false,
          errorCode: "invalidDocumentIds",
          error: "documentIds must be valid UUIDs",
        },
        { status: 400 }
      );
    }

    const receivedAmount = Number(body?.received_amount);
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      return Response.json(
        {
          ok: false,
          errorCode: "invalidAmount",
          error: "received_amount must be > 0",
        },
        { status: 400 }
      );
    }

    const currency =
      typeof body?.currency === "string" ? body.currency.trim() : "";
    if (!currency) {
      return Response.json(
        {
          ok: false,
          errorCode: "invalidCurrency",
          error: "currency is required",
        },
        { status: 400 }
      );
    }

    if (!isPaymentMethod(body?.method)) {
      return Response.json(
        {
          ok: false,
          errorCode: "invalidPaymentMethod",
          error: "method is invalid",
        },
        { status: 400 }
      );
    }

    const paymentDateRaw =
      typeof body?.payment_date === "string" ? body.payment_date.trim() : "";
    const paymentDate = paymentDateRaw ? new Date(paymentDateRaw) : new Date();
    if (!Number.isFinite(paymentDate.getTime())) {
      return Response.json(
        {
          ok: false,
          errorCode: "invalidPaymentDate",
          error: "payment_date is invalid",
        },
        { status: 400 }
      );
    }

    const receiptNo =
      typeof body?.receipt_no === "string" ? body.receipt_no.trim() : "";
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    const meta = getRequestMeta(req);

    const results: Array<{
      documentId: string;
      ok: boolean;
      error?: string;
    }> = [];

    for (const documentId of documentIds) {
      try {
        await addPaymentAndUpdateStatus({
          documentId,
          receivedAmount,
          currency,
          method: body.method,
          paymentDate,
          receiptNo: receiptNo ? receiptNo : null,
          note: note ? note : null,
          userId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
        results.push({ documentId, ok: true });
      } catch (err) {
        const anyErr = err as { message?: string } | null;
        results.push({
          documentId,
          ok: false,
          error: anyErr?.message ?? "Failed",
        });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    const failedCount = results.length - okCount;

    return Response.json({
      ok: true,
      okCount,
      failedCount,
      results,
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    const errorCode =
      status === 401 || status === 403
        ? "forbidden"
        : status === 404
        ? "notFound"
        : "bulkAddPaymentFailed";

    return Response.json(
      {
        ok: false,
        errorCode,
        error: anyErr?.message ?? "Failed to add payments",
      },
      { status }
    );
  }
}
