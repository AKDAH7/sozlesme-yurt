"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";

import type { CreateDocumentRequestDto } from "@/types/dto";
import type { RequesterType } from "@/types/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type FormValues = {
  owner_full_name: string;
  owner_identity_no: string;
  owner_birth_date: string;

  university_name: string;
  dorm_name: string;
  dorm_address: string;
  issue_date: string;
  footer_datetime: string;

  requester_type: RequesterType;
  company_id: string;
  direct_customer_name: string;
  direct_customer_phone: string;

  price_amount: number;
  price_currency: string;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function SelectNative(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
      {...rest}
    />
  );
}

export default function NewDocumentPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const defaultFooterDatetimeLocal = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      owner_full_name: "",
      owner_identity_no: "",
      owner_birth_date: "",
      university_name: "",
      dorm_name: "",
      dorm_address: "",
      issue_date: "",
      footer_datetime: defaultFooterDatetimeLocal,
      requester_type: "direct",
      company_id: "",
      direct_customer_name: "",
      direct_customer_phone: "",
      price_amount: 0,
      price_currency: "TRY",
    },
  });

  const requesterType = useWatch({ control, name: "requester_type" });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    const payload: CreateDocumentRequestDto = {
      owner_full_name: values.owner_full_name,
      owner_identity_no: values.owner_identity_no,
      owner_birth_date: values.owner_birth_date,
      university_name: values.university_name,
      dorm_name: values.dorm_name || null,
      dorm_address: values.dorm_address || null,
      issue_date: values.issue_date,
      footer_datetime: values.footer_datetime,
      requester_type: values.requester_type,
      company_id:
        values.requester_type === "company" ? values.company_id : null,
      direct_customer_name:
        values.requester_type === "direct" ? values.direct_customer_name : null,
      direct_customer_phone:
        values.requester_type === "direct"
          ? values.direct_customer_phone
          : null,
      price_amount: Number(values.price_amount),
      price_currency: values.price_currency,
    };

    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      document?: { id: string };
    } | null;

    if (!response.ok || !data?.ok || !data.document?.id) {
      setError(data?.error ?? "Create failed");
      return;
    }

    router.push(`/documents/${data.document.id}`);
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Create document</h1>
        <p className="text-sm text-muted-foreground">
          Fill required fields and click Create.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Section title="Owner">
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Name</span>
            <Input {...register("owner_full_name", { required: true })} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">ID number</span>
            <Input {...register("owner_identity_no", { required: true })} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Date of birth</span>
            <Input
              type="date"
              {...register("owner_birth_date", { required: true })}
            />
          </label>
        </Section>

        <Section title="Document">
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">University</span>
            <Input {...register("university_name", { required: true })} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Accommodation</span>
            <Input {...register("dorm_name")} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Address</span>
            <Input {...register("dorm_address")} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">Issue date</span>
              <Input
                type="date"
                {...register("issue_date", { required: true })}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">
                Footer datetime
              </span>
              <Input
                type="datetime-local"
                {...register("footer_datetime", { required: true })}
              />
            </label>
          </div>
        </Section>

        <Section title="Requester">
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">
              Requester type
            </span>
            <SelectNative {...register("requester_type", { required: true })}>
              <option value="direct">Direct</option>
              <option value="company">Company</option>
            </SelectNative>
          </label>

          {requesterType === "company" ? (
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">Company ID</span>
              <Input {...register("company_id", { required: true })} />
            </label>
          ) : (
            <>
              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">
                  Customer name
                </span>
                <Input
                  {...register("direct_customer_name", { required: true })}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">
                  Customer phone
                </span>
                <Input {...register("direct_customer_phone")} />
              </label>
            </>
          )}
        </Section>

        <Section title="Pricing">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">Amount</span>
              <Input
                type="number"
                step="0.01"
                {...register("price_amount", {
                  required: true,
                  valueAsNumber: true,
                })}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">Currency</span>
              <Input {...register("price_currency", { required: true })} />
            </label>
          </div>
        </Section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/documents")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
