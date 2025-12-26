import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/Button";
import { requirePermission } from "@/lib/auth/permissions";
import { getUserByIdMinimal } from "@/lib/db/queries/users";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("users.details");
  const tRoles = await getTranslations("users.roles");

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

        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/users">{t("back")}</Link>
          </Button>
          <Button asChild>
            <Link href={`/users/${encodeURIComponent(user.id)}/edit`}>
              {t("edit")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.fullName")}
          </div>
          <div className="text-sm font-medium">{user.full_name}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.email")}
          </div>
          <div className="text-sm font-medium">{user.email}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.role")}
          </div>
          <div className="text-sm font-medium">{tRoles(user.role)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.status")}
          </div>
          <div className="text-sm font-medium">
            {user.is_active ? t("status.active") : t("status.inactive")}
          </div>
        </div>
      </div>
    </div>
  );
}
