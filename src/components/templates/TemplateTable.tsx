import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { TemplateListRow } from "@/lib/db/queries/templates";
import { TemplateActiveToggle } from "@/components/templates/TemplateActiveToggle";

export async function TemplateTable(props: { rows: TemplateListRow[] }) {
  const t = await getTranslations("templates.list");

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3">{t("table.name")}</th>
            <th className="px-4 py-3">{t("table.language")}</th>
            <th className="px-4 py-3">{t("table.variables")}</th>
            <th className="px-4 py-3">{t("table.status")}</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {props.rows.length ? (
            props.rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border/50 last:border-0"
              >
                <td className="px-4 py-3 font-medium">
                  <div className="grid gap-0.5">
                    <div>{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.description ?? "-"}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{r.language}</td>
                <td className="px-4 py-3">{r.variables_count}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs">
                    {r.is_active ? t("status.active") : t("status.inactive")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/templates/${r.id}/preview`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {t("actions.preview")}
                    </Link>
                    <Link
                      href={`/templates/${r.id}/edit`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {t("actions.edit")}
                    </Link>
                    <TemplateActiveToggle
                      templateId={r.id}
                      isActive={r.is_active}
                    />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                {t("table.empty")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
