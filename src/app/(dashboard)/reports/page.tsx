import { PaymentsByMethodTable } from "@/components/reports/PaymentsByMethodTable";
import { ReportsCards } from "@/components/reports/ReportsCards";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requirePermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import {
  getPaymentsByMethod,
  getReportsSummary,
  getTopRequestingCompanies,
  parseReportRange,
} from "@/lib/db/queries/reports";

function TopCompaniesTable(props: {
  rows: Array<{
    company_id: string;
    company_name: string;
    documents_count: number;
    total_sales: string;
  }>;
}) {
  const format = (value: string) =>
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-sm font-medium">En Çok Talep Eden Şirketler</div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3">Şirket</th>
              <th className="py-2 pr-3">Belge</th>
              <th className="py-2">Satış</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.length ? (
              props.rows.map((r) => (
                <tr
                  key={r.company_id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2 pr-3">{r.company_name}</td>
                  <td className="py-2 pr-3">{r.documents_count}</td>
                  <td className="py-2 font-medium">
                    {format(r.total_sales)} TRY
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-3 text-muted-foreground" colSpan={3}>
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  try {
    await requirePermission("reports:view");
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;
    if (status === 401) {
      redirect("/login");
    }

    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Erişim reddedildi. Bu sayfayı görüntüleme yetkiniz yok.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const range = parseReportRange({ from: sp.from ?? null, to: sp.to ?? null });

  const [summary, paymentsByMethod, topCompanies] = await Promise.all([
    getReportsSummary(range),
    getPaymentsByMethod(range),
    getTopRequestingCompanies({ ...range, limit: 10 }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Accounting summary</p>
      </div>

      <form className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">From</div>
          <Input type="date" name="from" defaultValue={range.from ?? ""} />
        </div>
        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">To</div>
          <Input type="date" name="to" defaultValue={range.to ?? ""} />
        </div>
        <div className="md:col-span-2 flex items-end">
          <Button type="submit" className="w-full">
            Apply
          </Button>
        </div>
      </form>

      <ReportsCards summary={summary} />

      <div className="grid gap-3 md:grid-cols-2">
        <PaymentsByMethodTable rows={paymentsByMethod} />
        <TopCompaniesTable rows={topCompanies} />
      </div>
    </div>
  );
}
