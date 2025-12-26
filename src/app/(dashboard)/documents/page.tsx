import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type {
  DocStatus,
  PaymentStatus,
  RequesterType,
  TrackingStatus,
} from "@/types/db";
import { listDocuments } from "@/lib/db/queries/documents";
import { requireUserId } from "@/lib/auth/requireUser";
import { listCompaniesMinimal } from "@/lib/db/queries/companies";
import { CheckCircle2, Circle } from "lucide-react";

function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs",
        "bg-muted text-foreground"
      )}
    >
      {value}
    </span>
  );
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    status?: string;
    tracking_status?: string;
    payment_status?: string;
    requester_type?: string;
    company_id?: string;
    sort?: string;
  }>;
}) {
  await requireUserId();
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(Number(sp.page ?? "1") || 1));
  const pageSize = Math.min(
    50,
    Math.max(1, Math.floor(Number(sp.pageSize ?? "20") || 20))
  );
  const q = (sp.q ?? "").trim();
  const statusParam = (sp.status ?? "").trim();
  const status: DocStatus | "" =
    statusParam === "active" || statusParam === "inactive"
      ? (statusParam as DocStatus)
      : "";

  const trackingParam = (sp.tracking_status ?? "").trim();
  const trackingStatus: TrackingStatus | "" =
    trackingParam === "created" ||
    trackingParam === "delivered_to_student" ||
    trackingParam === "delivered_to_agent" ||
    trackingParam === "shipped" ||
    trackingParam === "received" ||
    trackingParam === "cancelled"
      ? (trackingParam as TrackingStatus)
      : "";

  const paymentParam = (sp.payment_status ?? "").trim();
  const paymentStatus: PaymentStatus | "" =
    paymentParam === "unpaid" ||
    paymentParam === "partial" ||
    paymentParam === "paid"
      ? (paymentParam as PaymentStatus)
      : "";

  const requesterParam = (sp.requester_type ?? "").trim();
  const requesterType: RequesterType | "" =
    requesterParam === "company" || requesterParam === "direct"
      ? (requesterParam as RequesterType)
      : "";

  const companyId = (sp.company_id ?? "").trim();
  const sortParam = (sp.sort ?? "desc").trim().toLowerCase();
  const sortDir: "asc" | "desc" = sortParam === "asc" ? "asc" : "desc";

  const companies = await listCompaniesMinimal();

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
  const canPrev = page > 1;
  const canNext = page * pageSize < total;

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (targetPage > 1) params.set("page", String(targetPage));
    params.set("pageSize", String(pageSize));
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (trackingStatus) params.set("tracking_status", trackingStatus);
    if (paymentStatus) params.set("payment_status", paymentStatus);
    if (requesterType) params.set("requester_type", requesterType);
    if (companyId) params.set("company_id", companyId);
    if (sortDir) params.set("sort", sortDir);
    const qs = params.toString();
    return qs ? `/documents?${qs}` : "/documents";
  };

  const prevHref = buildHref(Math.max(1, page - 1));
  const nextHref = buildHref(page + 1);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">{`${total} total`}</p>
        </div>

        <Button asChild>
          <Link href="/documents/new">Create New</Link>
        </Button>
      </div>

      <form
        method="get"
        action="/documents"
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-6"
      >
        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">Search</div>
          <Input
            name="q"
            defaultValue={q}
            placeholder="Reference, barcode, owner name, ID number"
          />
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Status</div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="status"
            defaultValue={status}
          >
            <option value="">All</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Tracking</div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="tracking_status"
            defaultValue={trackingStatus}
          >
            <option value="">All</option>
            <option value="created">created</option>
            <option value="shipped">shipped</option>
            <option value="received">received</option>
            <option value="delivered_to_student">delivered_to_student</option>
            <option value="delivered_to_agent">delivered_to_agent</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Payment</div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="payment_status"
            defaultValue={paymentStatus}
          >
            <option value="">All</option>
            <option value="unpaid">unpaid</option>
            <option value="partial">partial</option>
            <option value="paid">paid</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Requester</div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="requester_type"
            defaultValue={requesterType}
          >
            <option value="">All</option>
            <option value="company">company</option>
            <option value="direct">direct</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">Company</div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="company_id"
            defaultValue={companyId}
          >
            <option value="">All</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Sort</div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="sort"
            defaultValue={sortDir}
          >
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Page size</div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="pageSize"
            defaultValue={String(pageSize)}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <div className="flex items-end gap-2 md:col-span-2">
          <Button type="submit">Apply</Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium">PDF</th>
              <th className="px-3 py-2 text-left font-medium">Creator</th>
              <th className="px-3 py-2 text-left font-medium">File Owner</th>
              <th className="px-3 py-2 text-left font-medium">ID Number</th>
              <th className="px-3 py-2 text-left font-medium">Reference</th>
              <th className="px-3 py-2 text-left font-medium">File Status</th>
              <th className="px-3 py-2 text-left font-medium">Tracking</th>
              <th className="px-3 py-2 text-left font-medium">Price</th>
              <th className="px-3 py-2 text-left font-medium">Payment</th>
              <th className="px-3 py-2 text-left font-medium">
                Company/Customer
              </th>
              <th className="px-3 py-2 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  {r.pdf_url && r.pdf_hash ? (
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </td>
                <td className="px-3 py-2">{r.creator_full_name}</td>
                <td className="px-3 py-2">
                  <Link className="hover:underline" href={`/documents/${r.id}`}>
                    {r.owner_full_name}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.owner_identity_no}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.reference_no}
                </td>
                <td className="px-3 py-2">
                  <StatusPill value={r.doc_status} />
                </td>
                <td className="px-3 py-2">
                  <StatusPill value={r.tracking_status} />
                </td>
                <td className="px-3 py-2">
                  {r.price_amount} {r.price_currency}
                </td>
                <td className="px-3 py-2">
                  <StatusPill value={r.payment_status} />
                </td>
                <td className="px-3 py-2">
                  {r.company_name ?? r.direct_customer_name ?? "-"}
                </td>
                <td className="px-3 py-2">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-center text-muted-foreground"
                  colSpan={11}
                >
                  No documents.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button asChild variant="secondary" disabled={!canPrev}>
          <Link href={prevHref} aria-disabled={!canPrev}>
            Prev
          </Link>
        </Button>

        <div className="text-sm text-muted-foreground">Page {page}</div>

        <Button asChild variant="secondary" disabled={!canNext}>
          <Link href={nextHref} aria-disabled={!canNext}>
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}
