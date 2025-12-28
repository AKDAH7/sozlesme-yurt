import type { DocumentDetailsDto } from "@/types/dto";
import { requirePermission } from "@/lib/auth/permissions";
import { companyExists } from "@/lib/db/queries/companies";
import { getDocumentById } from "@/lib/db/queries/documents";
import { updateDocumentDetails } from "@/lib/db/queries/documents";
import { getTemplateDetails } from "@/lib/db/queries/templates";
import { createNotification } from "@/lib/db/queries/notifications";
import { validateCreateDocumentBody } from "@/lib/validation/documents";

export const runtime = "nodejs";

function getRequestMeta(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;
  return { ipAddress, userAgent };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { role, companyId } = await requirePermission("documents:read");
    const { id } = await context.params;
    const doc = await getDocumentById(id);
    if (!doc) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (role === "company") {
      if (!companyId || doc.company_id !== companyId) {
        return Response.json(
          { ok: false, error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    const dto: DocumentDetailsDto = {
      id: doc.id,
      reference_no: doc.reference_no,
      barcode_id: doc.barcode_id,
      token: doc.token,
      doc_status: doc.doc_status,
      tracking_status: doc.tracking_status,
      payment_status: doc.payment_status,
      owner_full_name: doc.owner_full_name,
      owner_identity_no: doc.owner_identity_no,
      owner_birth_date: doc.owner_birth_date,
      university_name: doc.university_name,
      dorm_name: doc.dorm_name,
      dorm_address: doc.dorm_address,
      issue_date: doc.issue_date,
      footer_datetime: doc.footer_datetime,
      requester_type: doc.requester_type,
      company_id: doc.company_id,
      direct_customer_name: doc.direct_customer_name,
      direct_customer_phone: doc.direct_customer_phone,
      price_amount: doc.price_amount,
      price_currency: doc.price_currency,
      created_at: doc.created_at,
    };

    return Response.json({ ok: true, document: dto });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to load document" },
      { status }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role, companyId } = await requirePermission(
      "documents:create"
    );
    const { id } = await context.params;

    const current = await getDocumentById(id);
    if (!current) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (role === "company") {
      if (!companyId || current.company_id !== companyId) {
        return Response.json(
          { ok: false, error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    const body = (await request.json().catch(() => null)) as unknown;

    const isCompanyUser = role === "company";
    // Company accounts should not need to send requester/company fields.
    // Inject them from the session before validation.
    const bodyForValidation: unknown = isCompanyUser
      ? {
          ...(typeof body === "object" && body !== null
            ? (body as Record<string, unknown>)
            : {}),
          requester_type: "company",
          company_id: companyId ?? null,
        }
      : body;

    const validated = validateCreateDocumentBody(bodyForValidation);

    const bodyRecord =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : null;
    const templateIdProvided =
      bodyRecord !== null &&
      Object.prototype.hasOwnProperty.call(bodyRecord, "template_id");
    const templateValuesProvided =
      bodyRecord !== null &&
      Object.prototype.hasOwnProperty.call(bodyRecord, "template_values");
    const templateVersionProvided =
      bodyRecord !== null &&
      Object.prototype.hasOwnProperty.call(bodyRecord, "template_version");

    // Preserve existing template association unless the caller explicitly sends template_* fields.
    let templateId: string | null = current.template_id;
    let templateVersion: number | null = current.template_version;
    let templateValues: Record<string, unknown> | null =
      current.template_values;

    if (
      templateIdProvided ||
      templateValuesProvided ||
      templateVersionProvided
    ) {
      // Explicit update/removal requested.
      if (!validated.templateId) {
        templateId = null;
        templateVersion = null;
        templateValues = null;
      } else {
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

        const isChangingTemplate = current.template_id !== details.id;
        if (isChangingTemplate && !details.is_active) {
          return Response.json(
            { ok: false, error: "template is inactive" },
            { status: 400 }
          );
        }

        templateId = details.id;
        templateVersion =
          validated.templateVersion ??
          current.template_version ??
          details.latest_version;
        templateValues = validated.templateValues ?? current.template_values;
      }
    }

    const requesterType = isCompanyUser ? "company" : validated.requesterType;
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

    const meta = getRequestMeta(request);

    await updateDocumentDetails({
      documentId: id,
      input: {
        ownerFullName: validated.ownerFullName,
        ownerIdentityNo: validated.ownerIdentityNo,
        ownerBirthDate: validated.ownerBirthDate,
        universityName: validated.universityName,
        dormName: validated.dormName,
        dormAddress: validated.dormAddress,
        issueDate: validated.issueDate,
        footerDatetime: validated.footerDatetime,
        requesterType,
        companyId: requesterType === "company" ? resolvedCompanyId : null,
        directCustomerName:
          requesterType === "direct" ? validated.directCustomerName : null,
        directCustomerPhone:
          requesterType === "direct" ? validated.directCustomerPhone : null,

        // Company users can't change billing on edits (admin controls pricing).
        priceAmount: isCompanyUser
          ? Number(current.price_amount)
          : validated.priceAmount,
        priceCurrency: isCompanyUser
          ? current.price_currency
          : validated.priceCurrency,
        templateId,
        templateVersion,
        templateValues,
      },
      audit: {
        actionByUserId: userId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        detailsJson: { kind: "edit" },
      },
    });

    // Company edits should notify admins as a modification request.
    if (role === "company") {
      await createNotification({
        targetRole: "admin",
        title: "kind:company_requested_modifications",
        message: JSON.stringify({
          referenceNo: current.reference_no,
        }),
        href: `/documents/${id}`,
        createdByUserId: userId,
      }).catch(() => undefined);
    }

    return Response.json({ ok: true });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to update document" },
      { status }
    );
  }
}
