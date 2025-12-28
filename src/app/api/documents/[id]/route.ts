import type { DocumentDetailsDto } from "@/types/dto";
import { requirePermission } from "@/lib/auth/permissions";
import { companyExists } from "@/lib/db/queries/companies";
import { getDocumentById } from "@/lib/db/queries/documents";
import { updateDocumentDetails } from "@/lib/db/queries/documents";
import { getTemplateDetails } from "@/lib/db/queries/templates";
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
    await requirePermission("documents:read");
    const { id } = await context.params;
    const doc = await getDocumentById(id);
    if (!doc) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
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
    const { userId } = await requirePermission("documents:create");
    const { id } = await context.params;

    const current = await getDocumentById(id);
    if (!current) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const validated = validateCreateDocumentBody(body);

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
