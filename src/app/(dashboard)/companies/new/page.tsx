import { CompanyForm } from "@/components/companies/CompanyForm";
import { requirePermission } from "@/lib/auth/permissions";

export default async function Page() {
  await requirePermission("companies:manage");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Create Company</h1>
        <p className="text-sm text-muted-foreground">Add a new company</p>
      </div>
      <CompanyForm mode="create" />
    </div>
  );
}
