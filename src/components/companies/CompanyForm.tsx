import CompanyClientForm, {
  type CompanyFormValues,
} from "@/components/companies/CompanyClientForm";

export function CompanyForm(props: {
  mode: "create" | "edit";
  companyId?: string;
  initialValues?: Partial<CompanyFormValues>;
}) {
  return (
    <CompanyClientForm
      mode={props.mode}
      companyId={props.companyId}
      initialValues={props.initialValues}
    />
  );
}
