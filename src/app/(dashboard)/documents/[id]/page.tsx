import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { DocumentPdfActions } from "@/components/documents/DocumentDetails/DocumentPdfActions";
import { DocumentManagementPanel } from "@/components/documents/DocumentDetails/DocumentManagementPanel";
import { getDocumentById } from "@/lib/db/queries/documents";
import { requireUserId } from "@/lib/auth/requireUser";

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
  await requireUserId();
  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) return notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Document</h1>
          <p className="text-sm text-muted-foreground">{doc.reference_no}</p>
        </div>
        <div className="flex items-center gap-2">
          <DocumentPdfActions
            documentId={doc.id}
            hasPdf={Boolean(doc.pdf_url && doc.pdf_hash)}
          />
          <Button asChild variant="secondary">
            <Link href="/documents">Back</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
        <Field
          label="Reference"
          value={<span className="font-mono text-xs">{doc.reference_no}</span>}
        />
        <Field
          label="Barcode"
          value={<span className="font-mono text-xs">{doc.barcode_id}</span>}
        />
        <Field label="File status" value={doc.doc_status} />
        <Field label="Tracking" value={doc.tracking_status} />
      </section>

      <DocumentManagementPanel
        documentId={doc.id}
        initialDocStatus={doc.doc_status}
        initialTrackingStatus={doc.tracking_status}
        priceAmount={doc.price_amount}
        priceCurrency={doc.price_currency}
      />

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3">
        <Field label="Owner" value={doc.owner_full_name} />
        <Field
          label="ID Number"
          value={
            <span className="font-mono text-xs">{doc.owner_identity_no}</span>
          }
        />
        <Field label="Birth date" value={doc.owner_birth_date} />
        <Field label="University" value={doc.university_name} />
        <Field label="Accommodation" value={doc.dorm_name ?? "-"} />
        <Field label="Address" value={doc.dorm_address ?? "-"} />
        <Field label="Issue date" value={doc.issue_date} />
        <Field
          label="Footer datetime"
          value={new Date(doc.footer_datetime).toLocaleString()}
        />
        <Field label="Requester" value={doc.requester_type} />
        <Field
          label="Company/Customer"
          value={
            doc.requester_type === "company"
              ? doc.company_id ?? "-"
              : doc.direct_customer_name ?? "-"
          }
        />
        <Field
          label="Price"
          value={`${doc.price_amount} ${doc.price_currency}`}
        />
        <Field label="Payment" value={doc.payment_status} />
        <Field
          label="Created"
          value={new Date(doc.created_at).toLocaleString()}
        />
      </section>
    </div>
  );
}
