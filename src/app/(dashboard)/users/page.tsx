import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { UserTable } from "@/components/users/UserTable";
import { Button } from "@/components/ui/Button";
import { requirePermission } from "@/lib/auth/permissions";
import { listUsers } from "@/lib/db/queries/users";

export default async function Page() {
  const t = await getTranslations("users.list");
  await requirePermission("users:manage");
  const users = await listUsers();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("total", { total: users.length })}
          </p>
        </div>

        <Button asChild>
          <Link href="/users/new">{t("create")}</Link>
        </Button>
      </div>

      <UserTable users={users} />
    </div>
  );
}
