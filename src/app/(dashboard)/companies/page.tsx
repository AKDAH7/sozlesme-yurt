import Link from "next/link";

import { CompanyTable } from "@/components/companies/CompanyTable";
import { Button } from "@/components/ui/Button";
import { requirePermission } from "@/lib/auth/permissions";
import { listCompanies } from "@/lib/db/queries/companies";

export default async function Page() {
  await requirePermission("companies:manage");
  const rows = await listCompanies();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>

        <Button asChild>
          <Link href="/companies/new">Create</Link>
        </Button>
      </div>

      <CompanyTable rows={rows} />
    </div>
  );
}
