import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/Button";
import { DocumentPdfActions } from "@/components/documents/DocumentDetails/DocumentPdfActions";
import { DocumentManagementPanel } from "@/components/documents/DocumentDetails/DocumentManagementPanel";
import { requirePermission } from "@/lib/auth/permissions";
import { getDocumentById } from "@/lib/db/queries/documents";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export default async function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("documents.details");
  const tStatus = await getTranslations("status");
  const { id } = await params;

  const { role, companyId } = await requirePermission("documents:read");
  const doc = await getDocumentById(id);
  if (!doc) return notFound();

  if (role === "company") {
    if (!companyId || doc.company_id !== companyId) {
      return notFound();
    }
  }

  const isCompanyUser = role === "company";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <DocumentPdfActions
            documentId={doc.id}
            hasPdf={Boolean(doc.pdf_url && doc.pdf_hash)}
            canGeneratePdf={!isCompanyUser}
          />
          <Button asChild variant="secondary">
            <Link href={`/documents/${doc.id}/edit`}>{t("actions.edit")}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/documents">{t("back")}</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
        <Field
          label={t("fields.reference")}
          value={<span className="font-mono text-xs">{doc.reference_no}</span>}
        />
        <Field
          label={t("fields.barcode")}
          value={<span className="font-mono text-xs">{doc.barcode_id}</span>}
        />
        <Field
          label={t("fields.fileStatus")}
          value={tStatus(`document.${doc.doc_status}`)}
        />
        <Field
          label={t("fields.tracking")}
          value={tStatus(`tracking.${doc.tracking_status}`)}
        />
      </section>

      <DocumentManagementPanel
        documentId={doc.id}
        initialDocStatus={doc.doc_status}
        initialTrackingStatus={doc.tracking_status}
        priceAmount={doc.price_amount}
        priceCurrency={doc.price_currency}
        canManage={!isCompanyUser}
      />

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3">
        <Field label={t("fields.owner")} value={doc.owner_full_name} />
        <Field
          label={t("fields.idNumber")}
          value={
            <span className="font-mono text-xs">{doc.owner_identity_no}</span>
          }
        />
        <Field label={t("fields.birthDate")} value={doc.owner_birth_date} />
        <Field label={t("fields.university")} value={doc.university_name} />
        <Field label={t("fields.accommodation")} value={doc.dorm_name ?? "-"} />
        <Field label={t("fields.address")} value={doc.dorm_address ?? "-"} />
        <Field label={t("fields.issueDate")} value={doc.issue_date} />
        <Field
          label={t("fields.footerDatetime")}
          value={new Date(doc.footer_datetime).toLocaleString()}
        />
        {!isCompanyUser ? (
          <>
            <Field label={t("fields.requester")} value={doc.requester_type} />
            <Field
              label={t("fields.companyCustomer")}
              value={
                doc.requester_type === "company"
                  ? doc.company_id ?? "-"
                  : doc.direct_customer_name ?? "-"
              }
            />
          </>
        ) : null}
        <Field
          label={t("fields.price")}
          value={`${doc.price_amount} ${doc.price_currency}`}
        />
        <Field
          label={t("fields.payment")}
          value={tStatus(`payment.${doc.payment_status}`)}
        />
        <Field
          label={t("fields.created")}
          value={new Date(doc.created_at).toLocaleString()}
        />
      </section>
    </div>
  );
}
