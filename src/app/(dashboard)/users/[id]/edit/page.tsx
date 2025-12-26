import Link from "next/link";
import { getTranslations } from "next-intl/server";

import UserEditClient from "@/components/users/UserEditClient";
import { Button } from "@/components/ui/Button";
import { requirePermission } from "@/lib/auth/permissions";
import { getUserByIdMinimal } from "@/lib/db/queries/users";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("users.edit");

  await requirePermission("users:manage");
  const { id } = await props.params;
  const user = await getUserByIdMinimal(id);

  if (!user) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        {t("notFound")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <Button asChild variant="secondary">
          <Link href={`/users/${encodeURIComponent(user.id)}`}>
            {t("back")}
          </Link>
        </Button>
      </div>

      <UserEditClient
        user={{
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
        }}
      />
    </div>
  );
}
