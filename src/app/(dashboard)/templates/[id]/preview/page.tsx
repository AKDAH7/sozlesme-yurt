import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/Button";
import { DocumentPreview } from "@/components/documents/DocumentPreview/DocumentPreview";
import { requirePermission } from "@/lib/auth/permissions";
import { getTemplateDetails } from "@/lib/db/queries/templates";

export default async function Page(context: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("templates.preview");
  await requirePermission("templates:manage");

  const { id } = await context.params;
  const tpl = await getTemplateDetails({ templateId: id });
  if (!tpl) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{t("notFound")}</h1>
      </div>
    );
  }

  const html =
    (tpl.html_content.trim().startsWith("<!") ? "" : "<!doctype html>") +
    tpl.html_content;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle", { name: tpl.name, version: tpl.latest_version })}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/templates/${id}/edit`}>{t("backToEdit")}</Link>
        </Button>
      </div>

      <DocumentPreview
        html={html}
        className="h-[80vh] w-full rounded-lg border"
        title={tpl.name}
      />
    </div>
  );
}
