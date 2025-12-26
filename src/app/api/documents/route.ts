import type {
  DocStatus,
  PaymentStatus,
  RequesterType,
  TrackingStatus,
} from "@/types/db";
import type {
  CreateDocumentRequestDto,
  CreateDocumentResponseDto,
  ListDocumentsResponseDto,
} from "@/types/dto";
import { requirePermission } from "@/lib/auth/permissions";
import { companyExists } from "@/lib/db/queries/companies";
import { createDocument, listDocuments } from "@/lib/db/queries/documents";
import { validateCreateDocumentBody } from "@/lib/validation/documents";

function getRequestMeta(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;
  return { ipAddress, userAgent };
}

export async function POST(request: Request) {
  try {
    const { userId } = await requirePermission("documents:create");
    const body = (await request
      .json()
      .catch(() => null)) as CreateDocumentRequestDto | null;

    const validated = validateCreateDocumentBody(body);

    if (validated.requesterType === "company") {
      const ok = await companyExists(validated.companyId!);
      if (!ok) {
        return Response.json(
          { ok: false, error: "company_id does not exist" },
          { status: 400 }
        );
      }
    }

    const meta = getRequestMeta(request);
    const created = await createDocument({
      input: {
        createdByUserId: userId,
        ownerFullName: validated.ownerFullName,
        ownerIdentityNo: validated.ownerIdentityNo,
        ownerBirthDate: validated.ownerBirthDate,
        universityName: validated.universityName,
        dormName: validated.dormName,
        dormAddress: validated.dormAddress,
        issueDate: validated.issueDate,
        footerDatetime: validated.footerDatetime,
        requesterType: validated.requesterType,
        companyId:
          validated.requesterType === "company" ? validated.companyId : null,
        directCustomerName:
          validated.requesterType === "direct"
            ? validated.directCustomerName
            : null,
        directCustomerPhone:
          validated.requesterType === "direct"
            ? validated.directCustomerPhone
            : null,
        priceAmount: validated.priceAmount,
        priceCurrency: validated.priceCurrency,
      },
      audit: {
        actionByUserId: userId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    const response: CreateDocumentResponseDto = {
      ok: true,
      document: {
        id: created.id,
        reference_no: created.reference_no,
        barcode_id: created.barcode_id,
        token: created.token,
        created_at: created.created_at,
      },
    };

    return Response.json(response);
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to create document" },
      { status }
    );
  }
}

export async function GET(request: Request) {
  try {
    await requirePermission("documents:read");
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
    const q = (url.searchParams.get("q") ?? "").trim();
    const statusParam = (url.searchParams.get("status") ?? "").trim();
    const trackingParam = (
      url.searchParams.get("tracking_status") ?? ""
    ).trim();
    const paymentParam = (url.searchParams.get("payment_status") ?? "").trim();
    const requesterParam = (
      url.searchParams.get("requester_type") ?? ""
    ).trim();
    const companyId = (url.searchParams.get("company_id") ?? "").trim();
    const sortDirParam = (url.searchParams.get("sort") ?? "desc")
      .trim()
      .toLowerCase();
    const status: DocStatus | "" =
      statusParam === "active" || statusParam === "inactive"
        ? (statusParam as DocStatus)
        : "";

    const trackingStatus: TrackingStatus | "" =
      trackingParam === "created" ||
      trackingParam === "delivered_to_student" ||
      trackingParam === "delivered_to_agent" ||
      trackingParam === "shipped" ||
      trackingParam === "received" ||
      trackingParam === "cancelled"
        ? (trackingParam as TrackingStatus)
        : "";

    const paymentStatus: PaymentStatus | "" =
      paymentParam === "unpaid" ||
      paymentParam === "partial" ||
      paymentParam === "paid"
        ? (paymentParam as PaymentStatus)
        : "";

    const requesterType: RequesterType | "" =
      requesterParam === "company" || requesterParam === "direct"
        ? (requesterParam as RequesterType)
        : "";

    const sortDir: "asc" | "desc" = sortDirParam === "asc" ? "asc" : "desc";

    const { rows, total } = await listDocuments({
      page,
      pageSize,
      q,
      status,
      trackingStatus,
      paymentStatus,
      requesterType,
      companyId,
      sortDir,
    });

    const response: ListDocumentsResponseDto = {
      ok: true,
      page: Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1,
      pageSize: Number.isFinite(pageSize)
        ? Math.max(1, Math.floor(pageSize))
        : 20,
      total,
      rows: rows.map((r) => ({
        id: r.id,
        creator_full_name: r.creator_full_name,
        owner_full_name: r.owner_full_name,
        owner_identity_no: r.owner_identity_no,
        reference_no: r.reference_no,
        doc_status: r.doc_status,
        tracking_status: r.tracking_status,
        payment_status: r.payment_status,
        price_amount: r.price_amount,
        price_currency: r.price_currency,
        company_or_customer: r.company_name ?? r.direct_customer_name ?? "-",
        created_at: r.created_at,
      })),
    };

    return Response.json(response);
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to list documents" },
      { status }
    );
  }
}
