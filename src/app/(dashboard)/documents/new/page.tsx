"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import type { CreateDocumentRequestDto } from "@/types/dto";
import type { RequesterType } from "@/types/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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

type TemplateVariableDef = {
  key: string;
  label: string;
  label_i18n?: {
    tr?: string;
    en?: string;
    ar?: string;
  };
  type: "text" | "date" | "number";
  required: boolean;
  preset_value?: string | number | null;
};

function getTranslatedLabel(v: TemplateVariableDef, locale: string): string {
  const li = v.label_i18n;
  if (!li) return v.label;
  if (locale === "tr" && li.tr) return li.tr;
  if (locale === "en" && li.en) return li.en;
  if (locale === "ar" && li.ar) return li.ar;
  return v.label;
}

function hasPresetValue(v: TemplateVariableDef): boolean {
  const p = v.preset_value;
  if (typeof p === "number") return Number.isFinite(p);
  if (typeof p === "string") return p.trim().length > 0;
  return false;
}

function coercePresetValue(v: TemplateVariableDef): unknown {
  const p = v.preset_value;
  if (typeof p === "number") return p;
  if (typeof p !== "string") return "";

  if (v.type === "number") {
    const n = Number(p);
    return Number.isFinite(n) ? n : 0;
  }
  return p;
}

type TemplateListItem = {
  id: string;
  name: string;
  language: string;
  latest_version: number | null;
};

type TemplateDetails = {
  id: string;
  name: string;
  language: string;
  is_active: boolean;
  latest_version: number;
  variables_definition: TemplateVariableDef[];
};

const UNIVERSITY_OPTIONS = [
  "İstanbul Atlas Üniversitesi",
  "Altınbaş Üniversitesi",
  "İstanbul Aydın Üniversitesi",
  "İstanbul Arel Üniversitesi",
  "İstinye Üniversitesi",
  "Özyeğin Üniversitesi",
  "İstanbul Sabahattin Zaim Üniversitesi",
  "İstanbul Topkapı Üniversitesi",
  "İstanbul Gelişim Üniversitesi",
  "İstanbul Kent Üniversitesi",
  "İstanbul Medipol Üniversitesi",
  "İstanbul Okan Üniversitesi",
  "Haliç Üniversitesi",
  "İstanbul Kültür Üniversitesi",
  "Fenerbahçe Üniversitesi",
  "İstanbul Nişantaşı Üniversitesi",
  "Üsküdar Üniversitesi",
  "Bahçeşehir Üniversitesi",
  "İstanbul Yeni Yüzyıl Üniversitesi",
  "Işık Üniversitesi",
  "Biruni Üniversitesi",
  "İstanbul Gedik Üniversitesi",
  "Kadir Has Üniversitesi",
  "Fatih Sultan Mehmet Vakıf Üniversitesi",
  "İbn Haldun Üniversitesi",
  "Bezmialem Vakıf Üniversitesi",
  "Beykoz Üniversitesi",
  "İstanbul Beykent Üniversitesi",
  "İstanbul Bilgi Üniversitesi",
  "İstanbul Galata Üniversitesi",
  "İstanbul Esenyurt Üniversitesi",
  "Maltepe Üniversitesi",
  "Doğuş Üniversitesi",
  "İstanbul Ticaret Üniversitesi",
  "İstanbul Sağlık ve Teknoloji Üniversitesi",
  "Boğaziçi Üniversitesi",
  "Galatasaray Üniversitesi",
  "Marmara Üniversitesi",
  "Sağlık Bilimleri Üniversitesi",
  "Türk-Alman Üniversitesi",
  "İstanbul Teknik Üniversitesi",
  "İstanbul Üniversitesi",
  "İstanbul Üniversitesi-Cerrahpaşa",
  "Yıldız Teknik Üniversitesi",
  "İstanbul Medeniyet Üniversitesi",
  "Mimar Sinan Güzel Sanatlar Üniversitesi",
] as const;

function UniversityCombobox(props: {
  value: string;
  onChange: (next: string) => void;
  inputId?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => {
    const q = props.value.trim().toLocaleLowerCase("tr-TR");
    if (!q) return UNIVERSITY_OPTIONS as readonly string[];
    return (UNIVERSITY_OPTIONS as readonly string[]).filter((u) =>
      u.toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [props.value]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = wrapperRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={props.inputId}
        value={props.value}
        onChange={(e) => {
          props.onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Give click selection a moment before closing.
          window.setTimeout(() => setOpen(false), 0);
        }}
        disabled={props.disabled}
        required={props.required}
        autoComplete="off"
      />

      {open && !props.disabled ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-56 w-full max-w-full overflow-auto overflow-x-hidden rounded-md border border-border bg-background shadow-sm"
        >
          {options.length ? (
            options.map((u) => (
              <button
                key={u}
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  props.onChange(u);
                  setOpen(false);
                }}
              >
                <span className="block truncate">{u}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No results
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TemplateCombobox(props: {
  templates: TemplateListItem[];
  valueId: string;
  onChangeId: (nextId: string) => void;
  placeholder: string;
  defaultLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // Keep the input display in sync when the selection changes (without setState-in-effect).
  const selectedLabel = useMemo(() => {
    if (!props.valueId) return "";
    const found = props.templates.find((t) => t.id === props.valueId);
    return found ? `${found.name} (${found.language})` : "";
  }, [props.valueId, props.templates]);

  const options = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    const all = props.templates;
    if (!q) return all;
    return all.filter((tpl) => {
      const label = `${tpl.name} (${tpl.language})`.toLocaleLowerCase("tr-TR");
      return label.includes(q);
    });
  }, [query, props.templates]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = wrapperRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={selectedLabel || query}
        placeholder={props.placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 0);
        }}
        disabled={props.disabled}
        autoComplete="off"
      />

      {open && !props.disabled ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-56 w-full max-w-full overflow-auto overflow-x-hidden rounded-md border border-border bg-background shadow-sm"
        >
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              props.onChangeId("");
              setQuery("");
              setOpen(false);
            }}
          >
            <span className="block truncate">{props.defaultLabel}</span>
          </button>

          <div className="h-px w-full bg-border" />

          {options.length ? (
            options.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  props.onChangeId(tpl.id);
                  setQuery(`${tpl.name} (${tpl.language})`);
                  setOpen(false);
                }}
              >
                <span className="block truncate">{tpl.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {tpl.language}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No results
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RequesterTypeCombobox(props: {
  value: RequesterType;
  onChange: (next: RequesterType) => void;
  disabled?: boolean;
  required?: boolean;
  labelDirect: string;
  labelCompany: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = wrapperRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const label =
    props.value === "company" ? props.labelCompany : props.labelDirect;

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={label}
        readOnly
        disabled={props.disabled}
        required={props.required}
        onClick={() => {
          if (!props.disabled) setOpen((v) => !v);
        }}
        onFocus={() => {
          if (!props.disabled) setOpen(true);
        }}
      />

      {open && !props.disabled ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 w-full max-w-full overflow-hidden rounded-md border border-border bg-background shadow-sm"
        >
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              props.onChange("direct");
              setOpen(false);
            }}
          >
            <span className="block truncate">{props.labelDirect}</span>
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              props.onChange("company");
              setOpen(false);
            }}
          >
            <span className="block truncate">{props.labelCompany}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getCoreDocumentVariableDefs(
  t: (key: string) => string
): TemplateVariableDef[] {
  return [
    {
      key: "owner_full_name",
      label: t("fields.name"),
      type: "text",
      required: true,
    },
    {
      key: "owner_identity_no",
      label: t("fields.idNumber"),
      type: "text",
      required: true,
    },
    {
      key: "owner_birth_date",
      label: t("fields.birthDate"),
      type: "date",
      required: true,
    },
    {
      key: "university_name",
      label: t("fields.university"),
      type: "text",
      required: true,
    },
    {
      key: "dorm_name",
      label: t("fields.accommodation"),
      type: "text",
      required: false,
    },
    {
      key: "dorm_address",
      label: t("fields.address"),
      type: "text",
      required: false,
    },
    {
      key: "issue_date",
      label: t("fields.issueDate"),
      type: "date",
      required: true,
    },
    {
      key: "footer_datetime",
      label: t("fields.footerDatetime"),
      type: "text",
      required: true,
    },
    {
      key: "requester_type",
      label: t("fields.requesterType"),
      type: "text",
      required: true,
    },
    {
      key: "company_id",
      label: t("fields.companyId"),
      type: "text",
      required: false,
    },
    {
      key: "direct_customer_name",
      label: t("fields.customerName"),
      type: "text",
      required: false,
    },
    {
      key: "direct_customer_phone",
      label: t("fields.customerPhone"),
      type: "text",
      required: false,
    },
    {
      key: "price_amount",
      label: t("fields.amount"),
      type: "number",
      required: true,
    },
    {
      key: "price_currency",
      label: t("fields.currency"),
      type: "text",
      required: true,
    },
  ];
}

function applyTemplateAliasValues(
  values: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...values };

  const setIfMissing = (key: string, value: unknown) => {
    const cur = next[key];
    const isMissing =
      typeof cur === "undefined" ||
      cur === null ||
      (typeof cur === "string" && cur.trim() === "");
    if (isMissing) next[key] = value;
  };

  // Common aliases people use in templates.
  setIfMissing("full_name", next.owner_full_name);
  setIfMissing("identity_no", next.owner_identity_no);
  setIfMissing("birth_date", next.owner_birth_date);
  setIfMissing("university", next.university_name);
  setIfMissing("accommodation", next.dorm_name);
  setIfMissing("address", next.dorm_address);
  setIfMissing("amount", next.price_amount);
  setIfMissing("currency", next.price_currency);
  setIfMissing("companyId", next.company_id);
  setIfMissing("customer_name", next.direct_customer_name);
  setIfMissing("customer_phone", next.direct_customer_phone);
  setIfMissing("footerDateTime", next.footer_datetime);
  setIfMissing("requesterType", next.requester_type);

  return next;
}

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

export default function NewDocumentPage() {
  const t = useTranslations("documents.new");
  const locale = useLocale();

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [templateId, setTemplateId] = useState<string>(""); // empty = default
  const [templateDetails, setTemplateDetails] =
    useState<TemplateDetails | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, unknown>>(
    {}
  );
  const [dynamicSubmitting, setDynamicSubmitting] = useState(false);

  const defaultFooterDatetimeLocal = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }, []);

  const defaultIssueDate = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const {
    register,
    handleSubmit,
    control,
    setValue,
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
  const universityName = useWatch({ control, name: "university_name" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/templates?active=1", {
        method: "GET",
        headers: { "content-type": "application/json" },
      }).catch(() => null);
      if (!res || cancelled) return;

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        rows?: TemplateListItem[];
      } | null;
      if (!cancelled && data?.ok && Array.isArray(data.rows)) {
        setTemplates(data.rows);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    if (!templateId) {
      setTemplateDetails(null);
      setTemplateValues({});
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const res = await fetch(
        `/api/templates/${encodeURIComponent(templateId)}`
      ).catch(() => null);
      if (!res || cancelled) return;

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        template?: TemplateDetails;
        error?: string;
      } | null;

      if (!res.ok || !data?.ok || !data.template) {
        if (!cancelled) setError(data?.error ?? t("errors.templateLoadFailed"));
        return;
      }

      if (cancelled) return;
      setTemplateDetails(data.template);

      // Always include core document fields even if the template doesn't declare them.
      const coreDefs = getCoreDocumentVariableDefs((k) => t(k));
      const seen = new Set<string>();
      const mergedDefs: TemplateVariableDef[] = [];

      for (const v of coreDefs) {
        seen.add(v.key);
        const tpl = (data.template.variables_definition ?? []).find(
          (x) => x.key === v.key
        );
        mergedDefs.push({
          key: v.key,
          label: tpl?.label ?? v.label,
          type: tpl?.type ?? v.type,
          required: Boolean(v.required || tpl?.required),
          preset_value: tpl?.preset_value,
          label_i18n: tpl?.label_i18n,
        });
      }

      for (const v of data.template.variables_definition ?? []) {
        if (seen.has(v.key)) continue;
        seen.add(v.key);
        mergedDefs.push(v);
      }

      const nextValues: Record<string, unknown> = {};
      for (const v of mergedDefs) {
        if (hasPresetValue(v)) {
          nextValues[v.key] = coercePresetValue(v);
          continue;
        }
        if (v.key === "footer_datetime") {
          nextValues[v.key] = defaultFooterDatetimeLocal;
        } else if (v.key === "issue_date") {
          nextValues[v.key] = defaultIssueDate;
        } else if (v.key === "requester_type") {
          nextValues[v.key] = "direct";
        } else if (v.key === "price_currency") {
          nextValues[v.key] = "TRY";
        } else if (v.type === "number") {
          nextValues[v.key] = 0;
        } else {
          nextValues[v.key] = "";
        }
      }
      setTemplateValues(nextValues);
    })();

    return () => {
      cancelled = true;
    };
  }, [templateId, defaultFooterDatetimeLocal, defaultIssueDate, t]);

  const onSubmitDefault = handleSubmit(async (values) => {
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

      template_id: null,
      template_version: null,
      template_values: null,
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
      setError(data?.error ?? t("errors.createFailed"));
      return;
    }

    router.push(`/documents/${data.document.id}`);
    router.refresh();
  });

  const requesterTypeDynamic =
    (templateValues.requester_type as RequesterType | undefined) ?? "direct";

  const dynamicVariableDefs = useMemo(() => {
    if (!templateDetails) return [] as TemplateVariableDef[];
    const coreDefs = getCoreDocumentVariableDefs((k) => t(k));
    const byKey = new Map<string, TemplateVariableDef>();

    for (const core of coreDefs) {
      const tpl = (templateDetails.variables_definition ?? []).find(
        (x) => x.key === core.key
      );
      byKey.set(core.key, {
        key: core.key,
        label: tpl?.label ?? core.label,
        type: tpl?.type ?? core.type,
        required: Boolean(core.required || tpl?.required),
        preset_value: tpl?.preset_value,
        label_i18n: tpl?.label_i18n,
      });
    }

    for (const tpl of templateDetails.variables_definition ?? []) {
      if (!byKey.has(tpl.key)) byKey.set(tpl.key, tpl);
    }

    // Keep core fields first, then any extra template-specific fields.
    const coreKeys = new Set(coreDefs.map((d) => d.key));
    return [
      ...coreDefs.map((d) => byKey.get(d.key)!).filter(Boolean),
      ...Array.from(byKey.values()).filter((d) => !coreKeys.has(d.key)),
    ];
  }, [templateDetails, t]);

  function setTemplateValue(key: string, value: unknown) {
    setTemplateValues((prev) => ({ ...prev, [key]: value }));
  }

  function shouldHideKey(key: string): boolean {
    if (key === "company_id") return requesterTypeDynamic !== "company";
    if (key === "direct_customer_name")
      return requesterTypeDynamic !== "direct";
    if (key === "direct_customer_phone")
      return requesterTypeDynamic !== "direct";
    return false;
  }

  async function onSubmitDynamic(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!templateDetails) {
      setError(t("errors.templateLoadFailed"));
      return;
    }

    const rt = requesterTypeDynamic;
    if (rt !== "direct" && rt !== "company") {
      setError(t("errors.createFailed"));
      return;
    }

    setDynamicSubmitting(true);
    try {
      const templateValuesWithAliases =
        applyTemplateAliasValues(templateValues);
      const payload: CreateDocumentRequestDto = {
        owner_full_name: String(
          templateValuesWithAliases.owner_full_name ?? ""
        ),
        owner_identity_no: String(
          templateValuesWithAliases.owner_identity_no ?? ""
        ),
        owner_birth_date: String(
          templateValuesWithAliases.owner_birth_date ?? ""
        ),

        university_name: String(
          templateValuesWithAliases.university_name ?? ""
        ),
        dorm_name: (templateValuesWithAliases.dorm_name
          ? String(templateValuesWithAliases.dorm_name)
          : null) as string | null,
        dorm_address: (templateValuesWithAliases.dorm_address
          ? String(templateValuesWithAliases.dorm_address)
          : null) as string | null,
        issue_date: String(templateValuesWithAliases.issue_date ?? ""),
        footer_datetime: String(
          templateValuesWithAliases.footer_datetime ??
            defaultFooterDatetimeLocal
        ),

        requester_type: rt,
        company_id:
          rt === "company"
            ? String(templateValuesWithAliases.company_id ?? "")
            : null,
        direct_customer_name:
          rt === "direct"
            ? String(templateValuesWithAliases.direct_customer_name ?? "")
            : null,
        direct_customer_phone:
          rt === "direct"
            ? String(templateValuesWithAliases.direct_customer_phone ?? "")
            : null,

        price_amount: Number(templateValuesWithAliases.price_amount ?? 0),
        price_currency: String(
          templateValuesWithAliases.price_currency ?? "TRY"
        ),

        template_id: templateDetails.id,
        template_version: templateDetails.latest_version,
        template_values: templateValuesWithAliases,
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
        setError(data?.error ?? t("errors.createFailed"));
        return;
      }

      router.push(`/documents/${data.document.id}`);
      router.refresh();
    } finally {
      setDynamicSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Section title={t("fields.template")}>
        <label className="grid gap-1">
          <span className="text-sm text-muted-foreground">
            {t("fields.template")}
          </span>
          <TemplateCombobox
            templates={templates}
            valueId={templateId}
            onChangeId={setTemplateId}
            placeholder={t("fields.template")}
            defaultLabel={t("fields.templateDefault")}
          />
        </label>
      </Section>

      {templateId && templateDetails ? (
        <form onSubmit={onSubmitDynamic} className="space-y-4">
          <Section title={templateDetails.name}>
            {dynamicVariableDefs
              .filter((v) => !shouldHideKey(v.key) && !hasPresetValue(v))
              .map((v) => {
                const value = templateValues[v.key];

                if (v.key === "requester_type") {
                  const locked = hasPresetValue(v);
                  return (
                    <label key={v.key} className="grid gap-1">
                      <span className="text-sm text-muted-foreground">
                        {getTranslatedLabel(v, locale)}
                      </span>
                      <RequesterTypeCombobox
                        value={
                          (String(value ?? "direct") as RequesterType) ??
                          "direct"
                        }
                        disabled={locked}
                        required
                        labelDirect={t("fields.requesterDirect")}
                        labelCompany={t("fields.requesterCompany")}
                        onChange={(next) => setTemplateValue(v.key, next)}
                      />
                    </label>
                  );
                }

                const inputType =
                  v.key === "footer_datetime"
                    ? "datetime-local"
                    : v.key === "owner_birth_date" ||
                      v.key === "issue_date" ||
                      v.type === "date"
                    ? "date"
                    : v.type === "number"
                    ? "number"
                    : "text";

                const isRequired =
                  v.required ||
                  (v.key === "company_id" &&
                    requesterTypeDynamic === "company") ||
                  (v.key === "direct_customer_name" &&
                    requesterTypeDynamic === "direct");

                const locked = hasPresetValue(v);

                if (v.key === "university_name") {
                  return (
                    <label key={v.key} className="grid gap-1">
                      <span className="text-sm text-muted-foreground">
                        {getTranslatedLabel(v, locale)}
                      </span>
                      <UniversityCombobox
                        value={String(value ?? "")}
                        disabled={locked}
                        required={isRequired}
                        onChange={(next) => setTemplateValue(v.key, next)}
                      />
                    </label>
                  );
                }

                return (
                  <label key={v.key} className="grid gap-1">
                    <span className="text-sm text-muted-foreground">
                      {getTranslatedLabel(v, locale)}
                    </span>
                    <Input
                      type={inputType}
                      step={v.key === "price_amount" ? "0.01" : undefined}
                      disabled={locked}
                      value={
                        typeof value === "number"
                          ? String(value)
                          : String(value ?? "")
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        setTemplateValue(
                          v.key,
                          inputType === "number" ? Number(raw) : raw
                        );
                      }}
                      required={isRequired}
                    />
                  </label>
                );
              })}
          </Section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={dynamicSubmitting}>
              {dynamicSubmitting ? t("actions.creating") : t("actions.create")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/documents")}
            >
              {t("actions.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={onSubmitDefault} className="space-y-4">
          <Section title={t("sections.owner")}>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">
                {t("fields.name")}
              </span>
              <Input {...register("owner_full_name", { required: true })} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">
                {t("fields.idNumber")}
              </span>
              <Input {...register("owner_identity_no", { required: true })} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">
                {t("fields.birthDate")}
              </span>
              <Input
                type="date"
                {...register("owner_birth_date", { required: true })}
              />
            </label>
          </Section>

          <Section title={t("sections.document")}>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">
                {t("fields.university")}
              </span>
              <UniversityCombobox
                value={String(universityName ?? "")}
                required
                onChange={(next) =>
                  setValue("university_name", next, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">
                {t("fields.accommodation")}
              </span>
              <Input {...register("dorm_name")} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">
                {t("fields.address")}
              </span>
              <Input {...register("dorm_address")} />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">
                  {t("fields.issueDate")}
                </span>
                <Input
                  type="date"
                  {...register("issue_date", { required: true })}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">
                  {t("fields.footerDatetime")}
                </span>
                <Input
                  type="datetime-local"
                  {...register("footer_datetime", { required: true })}
                />
              </label>
            </div>
          </Section>

          <Section title={t("sections.requester")}>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">
                {t("fields.requesterType")}
              </span>
              <RequesterTypeCombobox
                value={(requesterType as RequesterType) ?? "direct"}
                required
                labelDirect={t("fields.requesterDirect")}
                labelCompany={t("fields.requesterCompany")}
                onChange={(next) =>
                  setValue("requester_type", next, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
              />
            </label>

            {requesterType === "company" ? (
              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">
                  {t("fields.companyId")}
                </span>
                <Input {...register("company_id", { required: true })} />
              </label>
            ) : (
              <>
                <label className="grid gap-1">
                  <span className="text-sm text-muted-foreground">
                    {t("fields.customerName")}
                  </span>
                  <Input
                    {...register("direct_customer_name", { required: true })}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-muted-foreground">
                    {t("fields.customerPhone")}
                  </span>
                  <Input {...register("direct_customer_phone")} />
                </label>
              </>
            )}
          </Section>

          <Section title={t("sections.pricing")}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">
                  {t("fields.amount")}
                </span>
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
                <span className="text-sm text-muted-foreground">
                  {t("fields.currency")}
                </span>
                <Input {...register("price_currency", { required: true })} />
              </label>
            </div>
          </Section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("actions.creating") : t("actions.create")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/documents")}
            >
              {t("actions.cancel")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
