import TemplateClientForm, {
  type TemplateFormValues,
} from "@/components/templates/TemplateClientForm";

export function TemplateForm(props: {
  mode: "create" | "edit";
  templateId?: string;
  initialValues?: Partial<TemplateFormValues>;
}) {
  return (
    <TemplateClientForm
      mode={props.mode}
      templateId={props.templateId}
      initialValues={props.initialValues}
    />
  );
}
