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
import { getCompanyById } from "@/lib/db/queries/companies";
import { getEffectivePrice } from "@/lib/db/queries/pricing";
import { getTemplateDetails } from "@/lib/db/queries/templates";
import { createNotification } from "@/lib/db/queries/notifications";
import { validateCreateDocumentBody } from "@/lib/validation/documents";

export const runtime = "nodejs";

function hasPresetValue(preset: unknown): preset is string | number {
  if (typeof preset === "number") return Number.isFinite(preset);
  if (typeof preset === "string") return preset.trim().length > 0;
  return false;
}

function coercePresetValue(type: unknown, preset: string | number): unknown {
  if (type === "number") {
    if (typeof preset === "number") return preset;
    const n = Number(preset);
    return Number.isFinite(n) ? n : 0;
  }
  return String(preset);
}

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
    const { userId, role, companyId } = await requirePermission(
      "documents:create"
    );
    const body = (await request
      .json()
      .catch(() => null)) as CreateDocumentRequestDto | null;

    const isCompanyUser = role === "company";

    // Company accounts should not need to send requester/company fields.
    // Inject them from the session before validation.
    const bodyForValidation: CreateDocumentRequestDto | null = isCompanyUser
      ? ({
          ...(body ?? ({} as CreateDocumentRequestDto)),
          requester_type: "company",
          company_id: companyId ?? null,
        } satisfies CreateDocumentRequestDto as CreateDocumentRequestDto)
      : body;

    const validated = validateCreateDocumentBody(bodyForValidation);

    let templateId: string | null = null;
    let templateVersion: number | null = null;
    let templateValues: Record<string, unknown> | null = null;

    if (validated.templateId) {
      const details = await getTemplateDetails({
        templateId: validated.templateId,
        version: validated.templateVersion ?? undefined,
      });
      if (!details) {
        return Response.json(
          { ok: false, error: "template_id does not exist" },
          { status: 400 }
        );
      }
      if (!details.is_active) {
        return Response.json(
          { ok: false, error: "template is inactive" },
          { status: 400 }
        );
      }

      templateId = details.id;
      templateVersion = details.latest_version;

      const nextValues: Record<string, unknown> = {
        ...(validated.templateValues ?? {}),
      };

      for (const v of details.variables_definition ?? []) {
        const preset = (v as { preset_value?: unknown }).preset_value;
        if (!hasPresetValue(preset)) continue;
        nextValues[v.key] = coercePresetValue(v.type, preset);
      }

      templateValues = nextValues;
    }

    if (isCompanyUser && !companyId) {
      return Response.json(
        { ok: false, error: "company account is missing company_id" },
        { status: 400 }
      );
    }

    const requesterType: RequesterType = isCompanyUser
      ? "company"
      : validated.requesterType;
    const resolvedCompanyId = isCompanyUser
      ? companyId ?? null
      : validated.requesterType === "company"
      ? validated.companyId
      : null;

    if (requesterType === "company") {
      if (!resolvedCompanyId) {
        return Response.json(
          { ok: false, error: "company account is missing company_id" },
          { status: 400 }
        );
      }

      const ok = await companyExists(resolvedCompanyId);
      if (!ok) {
        return Response.json(
          { ok: false, error: "company_id does not exist" },
          { status: 400 }
        );
      }
    }

    const effectivePrice =
      requesterType === "company" && resolvedCompanyId
        ? await getEffectivePrice({
            companyId: resolvedCompanyId,
            templateId,
          })
        : { amount: validated.priceAmount, currency: validated.priceCurrency };

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

        // Company-submitted requests must be reviewed by an admin.
        docStatus: isCompanyUser ? "inactive" : "active",
        requesterType,
        companyId: requesterType === "company" ? resolvedCompanyId : null,
        directCustomerName:
          requesterType === "direct" ? validated.directCustomerName : null,
        directCustomerPhone:
          requesterType === "direct" ? validated.directCustomerPhone : null,
        priceAmount: effectivePrice.amount,
        priceCurrency: effectivePrice.currency,

        templateId,
        templateVersion,
        templateValues,
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

    // Company-submitted documents are requests that admins should review.
    if (isCompanyUser && resolvedCompanyId) {
      const company = await getCompanyById(resolvedCompanyId).catch(() => null);
      const companyName = company?.company_name ?? "Company";
      await createNotification({
        targetRole: "admin",
        title: "kind:company_requested_document",
        message: JSON.stringify({
          companyName,
          referenceNo: created.reference_no,
        }),
        href: `/documents/${created.id}`,
        createdByUserId: userId,
      }).catch(() => undefined);
    }

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
    const { role, companyId: userCompanyId } = await requirePermission(
      "documents:read"
    );
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

    const isCompanyUser = role === "company";

    if (isCompanyUser && !userCompanyId) {
      return Response.json(
        { ok: false, error: "company account is missing company_id" },
        { status: 400 }
      );
    }
    const scopedCompanyId = isCompanyUser ? userCompanyId ?? "" : companyId;

    const { rows, total } = await listDocuments({
      page,
      pageSize,
      q,
      status,
      trackingStatus,
      paymentStatus,
      requesterType,
      companyId: scopedCompanyId,
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
