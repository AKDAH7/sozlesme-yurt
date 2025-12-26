import { CompanyForm } from "@/components/companies/CompanyForm";
import { requirePermission } from "@/lib/auth/permissions";
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("companies.form.create");
  await requirePermission("companies:manage");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CompanyForm mode="create" />
    </div>
  );
}
