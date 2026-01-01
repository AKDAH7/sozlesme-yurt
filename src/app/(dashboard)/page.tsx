import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { requirePermission } from "@/lib/auth/permissions";
import { listDocuments } from "@/lib/db/queries/documents";
import { PendingCompanyRequestActions } from "@/components/dashboard/PendingCompanyRequestActions";

export default function Home() {
  // This page is a Server Component.
   
  return <HomeContent />;
}

async function HomeContent() {
  const tApp = await getTranslations("app");
  const t = await getTranslations("dashboard.home");
  const tDocs = await getTranslations("documents.list");
  const tStatus = await getTranslations("status");

  let role: string | null = null;
  try {
    const auth = await requirePermission("documents:read");
    role = auth.role;
  } catch {
    role = null;
  }

  const showRequests = role !== null && role !== "company";
  const { rows } = showRequests
    ? await listDocuments({
        page: 1,
        pageSize: 10,
        q: "",
        status: "inactive",
        requesterType: "company",
        companyId: "",
        sortDir: "desc",
      })
    : { rows: [] };

  return (
    <section className="space-y-2">
      <h1 className="text-xl font-semibold">{tApp("controlPanel")}</h1>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>

      {showRequests ? (
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium">{t("requestsTitle")}</div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">{tDocs("table.reference")}</th>
                  <th className="py-2 pr-3">
                    {tDocs("table.companyCustomer")}
                  </th>
                  <th className="py-2 pr-3">{tDocs("table.created")}</th>
                  <th className="py-2">{tDocs("table.pdf")}</th>
                  <th className="py-2 pl-3">{t("requestsActions.title")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-2 pr-3">
                        <Link
                          className="underline-offset-4 hover:underline"
                          href={`/documents/${r.id}`}
                        >
                          {r.reference_no}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{r.company_name ?? "-"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="py-2">
                        {r.pdf_url && r.pdf_hash
                          ? tStatus("pdf.ready")
                          : tStatus("pdf.notReady")}
                      </td>
                      <td className="py-2 pl-3">
                        <PendingCompanyRequestActions
                          documentId={r.id}
                          hasPdf={Boolean(r.pdf_url && r.pdf_hash)}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={5}>
                      {t("requestsEmpty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
