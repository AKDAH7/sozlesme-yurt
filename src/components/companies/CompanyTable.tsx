import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { CompanyRow } from "@/lib/db/queries/companies";

export async function CompanyTable(props: { rows: CompanyRow[] }) {
  const t = await getTranslations("companies.table");
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3">{t("company")}</th>
            <th className="px-4 py-3">{t("contact")}</th>
            <th className="px-4 py-3">{t("phone")}</th>
            <th className="px-4 py-3">{t("email")}</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {props.rows.length ? (
            props.rows.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border/50 last:border-0"
              >
                <td className="px-4 py-3 font-medium">{c.company_name}</td>
                <td className="px-4 py-3">{c.contact_name ?? "-"}</td>
                <td className="px-4 py-3">{c.contact_phone ?? "-"}</td>
                <td className="px-4 py-3">{c.contact_email ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/companies/${c.id}/edit`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {t("edit")}
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                {t("empty")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
