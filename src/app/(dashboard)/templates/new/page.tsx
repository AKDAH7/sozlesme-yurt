import { getTranslations } from "next-intl/server";

import { TemplateForm } from "@/components/templates/TemplateForm";
import { requirePermission } from "@/lib/auth/permissions";

export default async function Page() {
  const t = await getTranslations("templates.form.create");
  await requirePermission("templates:manage");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <TemplateForm mode="create" />
    </div>
  );
}
