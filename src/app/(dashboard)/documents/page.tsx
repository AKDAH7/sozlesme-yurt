import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { DocStatus, RequesterType, TrackingStatus } from "@/types/db";
import { listDocuments } from "@/lib/db/queries/documents";
import { listCompaniesMinimal } from "@/lib/db/queries/companies";
import { requirePermission } from "@/lib/auth/permissions";
import { DocumentsTableClient } from "@/components/documents/DocumentsTableClient";

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
    payment_group?: string;
    requester_type?: string;
    company_id?: string;
    sort?: string;
  }>;
}) {
  const t = await getTranslations("documents.list");
  const tStatus = await getTranslations("status");

  const { role, companyId: userCompanyId } = await requirePermission(
    "documents:read"
  );
  const isCompanyUser = role === "company";

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
    trackingParam === "residence_file_delivered" ||
    trackingParam === "residence_file_received" ||
    trackingParam === "shipped" ||
    trackingParam === "received" ||
    trackingParam === "cancelled"
      ? (trackingParam as TrackingStatus)
      : "";

  const paymentGroupParam = (sp.payment_group ?? "").trim().toLowerCase();
  const paymentLegacy = (sp.payment_status ?? "").trim().toLowerCase();
  const paymentGroup: "" | "paid" | "unpaid" =
    paymentGroupParam === "paid" || paymentGroupParam === "unpaid"
      ? (paymentGroupParam as "paid" | "unpaid")
      : paymentLegacy === "paid"
      ? "paid"
      : paymentLegacy === "unpaid" || paymentLegacy === "partial"
      ? "unpaid"
      : "";

  const requesterParam = (sp.requester_type ?? "").trim();
  const requesterType: RequesterType | "" = isCompanyUser
    ? ""
    : requesterParam === "company" || requesterParam === "direct"
    ? (requesterParam as RequesterType)
    : "";

  const companyId = isCompanyUser
    ? userCompanyId ?? "__missing_company_id__"
    : (sp.company_id ?? "").trim();
  const sortParam = (sp.sort ?? "desc").trim().toLowerCase();
  const sortDir: "asc" | "desc" = sortParam === "asc" ? "asc" : "desc";

  const companies = isCompanyUser ? [] : await listCompaniesMinimal();

  const { rows, total } = await listDocuments({
    page,
    pageSize,
    q,
    status,
    trackingStatus,
    paymentGroup,
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
    if (paymentGroup) params.set("payment_group", paymentGroup);
    if (!isCompanyUser) {
      if (requesterType) params.set("requester_type", requesterType);
      if (companyId) params.set("company_id", companyId);
    }
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
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("total", { total })}
          </p>
        </div>

        <Button asChild>
          <Link href="/documents/new">{t("createNew")}</Link>
        </Button>
      </div>

      <form
        method="get"
        action="/documents"
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-6"
      >
        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">
            {t("filters.search")}
          </div>
          <Input
            name="q"
            defaultValue={q}
            placeholder={t("filters.searchPlaceholder")}
          />
        </div>

        <div>
          <div className="text-xs text-muted-foreground">
            {t("filters.status")}
          </div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="status"
            defaultValue={status}
          >
            <option value="">{t("filters.all")}</option>
            <option value="active">{tStatus("document.active")}</option>
            <option value="inactive">{tStatus("document.inactive")}</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">
            {t("filters.tracking")}
          </div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="tracking_status"
            defaultValue={trackingStatus}
          >
            <option value="">{t("filters.all")}</option>
            <option value="created">{tStatus("tracking.created")}</option>
            <option value="residence_file_delivered">
              {tStatus("tracking.residence_file_delivered")}
            </option>
            <option value="residence_file_received">
              {tStatus("tracking.residence_file_received")}
            </option>
            <option value="shipped">{tStatus("tracking.shipped")}</option>
            <option value="received">{tStatus("tracking.received")}</option>
            <option value="delivered_to_student">
              {tStatus("tracking.delivered_to_student")}
            </option>
            <option value="delivered_to_agent">
              {tStatus("tracking.delivered_to_agent")}
            </option>
            <option value="cancelled">{tStatus("tracking.cancelled")}</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">
            {t("filters.payment")}
          </div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="payment_group"
            defaultValue={paymentGroup}
          >
            <option value="">{t("filters.all")}</option>
            <option value="paid">{tStatus("payment.paid")}</option>
            <option value="unpaid">{tStatus("payment.unpaid")}</option>
          </select>
        </div>

        {isCompanyUser ? null : (
          <>
            <div>
              <div className="text-xs text-muted-foreground">
                {t("filters.requester")}
              </div>
              <select
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                )}
                name="requester_type"
                defaultValue={requesterType}
              >
                <option value="">{t("filters.all")}</option>
                <option value="company">{t("filters.requesterCompany")}</option>
                <option value="direct">{t("filters.requesterDirect")}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground">
                {t("filters.company")}
              </div>
              <select
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                )}
                name="company_id"
                defaultValue={companyId}
              >
                <option value="">{t("filters.all")}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <div className="text-xs text-muted-foreground">
            {t("filters.sort")}
          </div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            name="sort"
            defaultValue={sortDir}
          >
            <option value="desc">{t("filters.newest")}</option>
            <option value="asc">{t("filters.oldest")}</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">
            {t("filters.pageSize")}
          </div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
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
          <Button type="submit">{t("filters.apply")}</Button>
        </div>
      </form>

      <DocumentsTableClient rows={rows} />

      <div className="flex items-center justify-between">
        <Button asChild variant="secondary" disabled={!canPrev}>
          <Link href={prevHref} aria-disabled={!canPrev}>
            {t("pagination.prev")}
          </Link>
        </Button>

        <div className="text-sm text-muted-foreground">
          {t("pagination.page", { page })}
        </div>

        <Button asChild variant="secondary" disabled={!canNext}>
          <Link href={nextHref} aria-disabled={!canNext}>
            {t("pagination.next")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
