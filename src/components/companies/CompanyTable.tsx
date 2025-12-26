import Link from "next/link";

import type { CompanyRow } from "@/lib/db/queries/companies";

export function CompanyTable(props: { rows: CompanyRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3">Şirket</th>
            <th className="px-4 py-3">İletişim</th>
            <th className="px-4 py-3">Telefon</th>
            <th className="px-4 py-3">E-posta</th>
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
                    Düzenle
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                Kayıt yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
