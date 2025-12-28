import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/Button";
import { DocumentEditClient } from "@/components/documents/DocumentEditClient";
import { requirePermission } from "@/lib/auth/permissions";
import { getDocumentById } from "@/lib/db/queries/documents";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("documents.edit");
  await requirePermission("documents:create");

  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) return notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Button asChild variant="secondary">
          <a href={`/documents/${doc.id}`}>{t("actions.cancel")}</a>
        </Button>
      </div>

      <DocumentEditClient
        initial={{
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
          template_id: doc.template_id,
          template_version: doc.template_version,
          template_values: doc.template_values,
        }}
      />
    </div>
  );
}
