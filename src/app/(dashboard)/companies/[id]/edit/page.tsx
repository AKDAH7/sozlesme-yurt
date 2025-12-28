import { CompanyForm } from "@/components/companies/CompanyForm";
import { CompanyAccountCard } from "@/components/companies/CompanyAccountCard";
import { CompanyPricingCard } from "@/components/companies/CompanyPricingCard";
import { requirePermission } from "@/lib/auth/permissions";
import { getCompanyById } from "@/lib/db/queries/companies";
import { getTranslations } from "next-intl/server";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("companies.form.edit");
  const tForm = await getTranslations("companies.form");
  await requirePermission("companies:manage");
  const { id } = await props.params;
  const company = await getCompanyById(id);
  if (!company) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        {t("notFound")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{company.company_name}</p>
        <p className="text-xs text-muted-foreground">
          {tForm("fields.refCode")}: {company.ref_code ?? "-"}
        </p>
      </div>
      <CompanyForm
        mode="edit"
        companyId={company.id}
        initialValues={{
          company_name: company.company_name,
          ref_code: company.ref_code ?? "",
          contact_name: company.contact_name ?? "",
          contact_phone: company.contact_phone ?? "",
          contact_email: company.contact_email ?? "",
          notes: company.notes ?? "",
        }}
      />

      <CompanyAccountCard
        companyId={company.id}
        companyName={company.company_name}
      />
      <CompanyPricingCard companyId={company.id} />
    </div>
  );
}
