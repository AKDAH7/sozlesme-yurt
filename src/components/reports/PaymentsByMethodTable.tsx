import type { PaymentMethod } from "@/types/db";
import { getLocale, getTranslations } from "next-intl/server";

export async function PaymentsByMethodTable(props: {
  rows: Array<{ method: PaymentMethod; total_received: string }>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("reports.paymentsByMethod");
  const tMethod = await getTranslations("status.paymentMethod");

  const format = (value: string) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-sm font-medium">{t("title")}</div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3">{t("columns.method")}</th>
              <th className="py-2">{t("columns.total")}</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.length ? (
              props.rows.map((r) => (
                <tr
                  key={r.method}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2 pr-3">{tMethod(r.method)}</td>
                  <td className="py-2 font-medium">
                    {format(r.total_received)} TRY
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-3 text-muted-foreground" colSpan={2}>
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
