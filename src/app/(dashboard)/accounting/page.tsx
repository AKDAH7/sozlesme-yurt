import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AccountingClient } from "@/components/accounting/AccountingClient";
import { requirePermission } from "@/lib/auth/permissions";
import { listCompaniesMinimal } from "@/lib/db/queries/companies";
import { listDocuments } from "@/lib/db/queries/documents";
import { getReportsSummary, parseReportRange } from "@/lib/db/queries/reports";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    company_id?: string;
    payment_group?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const t = await getTranslations("accounting.page");

  let auth: { role: string };
  try {
    const { role } = await requirePermission("accounting:view");
    auth = { role };
  } catch (err) {
    const anyErr = err as { status?: number } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    if (status === 401) redirect("/login");

    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("accessDenied")}</p>
      </div>
    );
  }

  const sp = await searchParams;
  const range = parseReportRange({ from: sp.from ?? null, to: sp.to ?? null });
  const companyId = (sp.company_id ?? "").trim() || null;

  const paymentGroupParam = (sp.payment_group ?? "").trim().toLowerCase();
  const paymentGroup: "" | "paid" | "unpaid" =
    paymentGroupParam === "paid" || paymentGroupParam === "unpaid"
      ? (paymentGroupParam as "paid" | "unpaid")
      : "";

  const page = Math.max(1, Math.floor(Number(sp.page ?? "1") || 1));
  const pageSize = Math.min(
    50,
    Math.max(1, Math.floor(Number(sp.pageSize ?? "20") || 20))
  );

  const [companies, summary, docs] = await Promise.all([
    listCompaniesMinimal(),
    getReportsSummary({ ...range, companyId }),
    listDocuments({
      page,
      pageSize,
      q: "",
      status: "",
      companyId: companyId ?? "",
      paymentGroup,
      from: range.from,
      to: range.to,
      sortDir: "desc",
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <AccountingClient
        role={auth.role}
        companies={companies}
        initialCompanyId={companyId}
        initialPaymentGroup={paymentGroup}
        initialFrom={range.from}
        initialTo={range.to}
        page={page}
        pageSize={pageSize}
        total={docs.total}
        summary={summary}
        documents={docs.rows}
      />
    </div>
  );
}
