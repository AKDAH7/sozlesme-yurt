import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CompanyTable } from "@/components/companies/CompanyTable";
import { Button } from "@/components/ui/Button";
import { requirePermission } from "@/lib/auth/permissions";
import { listCompanies } from "@/lib/db/queries/companies";

export default async function Page() {
  const t = await getTranslations("companies.list");
  await requirePermission("companies:manage");
  const rows = await listCompanies();
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
          <Link href="/companies/new">{t("create")}</Link>
        </Button>
      </div>

      <CompanyTable rows={rows} />
    </div>
  );
}
