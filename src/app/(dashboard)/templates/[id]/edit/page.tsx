import { getTranslations } from "next-intl/server";

import { TemplateForm } from "@/components/templates/TemplateForm";
import { requirePermission } from "@/lib/auth/permissions";
import { getTemplateDetails } from "@/lib/db/queries/templates";

export default async function Page(context: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("templates.form.edit");
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { version: tpl.latest_version })}
        </p>
      </div>

      <TemplateForm
        mode="edit"
        templateId={id}
        initialValues={{
          name: tpl.name,
          description: tpl.description ?? "",
          language: tpl.language,
          is_active: tpl.is_active,
          html_content: tpl.html_content,
          variables_definition: tpl.variables_definition.map((v) => ({
            key: v.key,
            label: v.label,
            label_tr: v.label_i18n?.tr ?? "",
            label_en: v.label_i18n?.en ?? "",
            label_ar: v.label_i18n?.ar ?? "",
            preset_value:
              typeof v.preset_value === "number"
                ? String(v.preset_value)
                : typeof v.preset_value === "string"
                ? v.preset_value
                : "",
            type: v.type,
            required: Boolean(v.required),
          })),
        }}
      />
    </div>
  );
}
