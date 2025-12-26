import { CompanyForm } from "@/components/companies/CompanyForm";
import { requirePermission } from "@/lib/auth/permissions";
import { getCompanyById } from "@/lib/db/queries/companies";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  await requirePermission("companies:manage");
  const { id } = await props.params;
  const company = await getCompanyById(id);
  if (!company) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        Not found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Edit Company</h1>
        <p className="text-sm text-muted-foreground">{company.company_name}</p>
      </div>
      <CompanyForm
        mode="edit"
        companyId={company.id}
        initialValues={{
          company_name: company.company_name,
          contact_name: company.contact_name ?? "",
          contact_phone: company.contact_phone ?? "",
          contact_email: company.contact_email ?? "",
          notes: company.notes ?? "",
        }}
      />
    </div>
  );
}
