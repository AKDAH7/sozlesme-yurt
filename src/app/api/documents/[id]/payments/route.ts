import type { PaymentMethod } from "@/types/db";
import { requirePermission } from "@/lib/auth/permissions";
import {
  addPaymentAndUpdateStatus,
  getPaymentSummary,
  listPayments,
} from "@/lib/db/queries/documents";

export const runtime = "nodejs";

type PostBody = {
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("documents:read");
    const { id } = await context.params;

    const [payments, summary] = await Promise.all([
      listPayments(id),
      getPaymentSummary(id),
    ]);

    return Response.json({ ok: true, summary, payments });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    const errorCode =
      status === 401 || status === 403
        ? "forbidden"
        : status === 404
        ? "notFound"
        : "listPaymentsFailed";

    return Response.json(
      {
        ok: false,
        errorCode,
        error: anyErr?.message ?? "Failed to load payments",
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
    const { userId } = await requirePermission("documents:add_payment");
    const { id } = await context.params;

    const body = (await request.json().catch(() => null)) as PostBody | null;

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

    const meta = getRequestMeta(request);
    const inserted = await addPaymentAndUpdateStatus({
      documentId: id,
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

    const [payments, summary] = await Promise.all([
      listPayments(id),
      getPaymentSummary(id),
    ]);

    return Response.json({
      ok: true,
      payment_id: inserted.paymentId,
      payment_status: inserted.payment_status,
      summary,
      payments,
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
        : "addPaymentFailed";

    return Response.json(
      {
        ok: false,
        errorCode,
        error: anyErr?.message ?? "Failed to add payment",
      },
      { status }
    );
  }
}
