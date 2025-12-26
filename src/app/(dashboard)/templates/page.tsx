import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/Button";
import { TemplateTable } from "@/components/templates/TemplateTable";
import { requirePermission } from "@/lib/auth/permissions";
import { listTemplates } from "@/lib/db/queries/templates";

export default async function Page() {
  const t = await getTranslations("templates.list");
  await requirePermission("templates:manage");

  const rows = await listTemplates({ activeOnly: false });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("total", { total: rows.length })}
          </p>
        </div>

        <Button asChild>
          <Link href="/templates/new">{t("create")}</Link>
        </Button>
      </div>

      <TemplateTable rows={rows} />
    </div>
  );
}
