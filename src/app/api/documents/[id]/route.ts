import type { DocumentDetailsDto } from "@/types/dto";
import { requirePermission } from "@/lib/auth/permissions";
import { getDocumentById } from "@/lib/db/queries/documents";

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

export async function PATCH() {
  return Response.json(
    { ok: false, error: "Not implemented" },
    { status: 501 }
  );
}
