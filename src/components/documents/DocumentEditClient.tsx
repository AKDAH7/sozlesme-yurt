"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { DocumentDetailsDto } from "@/types/dto";

type DocumentEditDto = DocumentDetailsDto & {
  template_id?: string | null;
  template_version?: number | null;
  template_values?: Record<string, unknown> | null;
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
        value={props.value}
        onChange={(e) => {
          props.onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
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

function toDateOnlyValue(input: string): string {
  // Expect input already like YYYY-MM-DD (API returns text)
  if (typeof input !== "string") return "";
  return input.slice(0, 10);
}

function toDatetimeLocalValue(iso: string): string {
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function DocumentEditClient(props: {
  initial: DocumentEditDto;
  isCompanyUser?: boolean;
}) {
  const t = useTranslations("documents.edit");
  const tNew = useTranslations("documents.new");

  const isCompanyUser = Boolean(props.isCompanyUser);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ownerFullName, setOwnerFullName] = useState(
    props.initial.owner_full_name
  );
  const [ownerIdentityNo, setOwnerIdentityNo] = useState(
    props.initial.owner_identity_no
  );
  const [ownerBirthDate, setOwnerBirthDate] = useState(
    toDateOnlyValue(props.initial.owner_birth_date)
  );

  const [universityName, setUniversityName] = useState(
    props.initial.university_name
  );
  const [dormName, setDormName] = useState(props.initial.dorm_name ?? "");
  const [dormAddress, setDormAddress] = useState(
    props.initial.dorm_address ?? ""
  );

  const [issueDate, setIssueDate] = useState(
    toDateOnlyValue(props.initial.issue_date)
  );
  const [footerDatetime, setFooterDatetime] = useState(
    toDatetimeLocalValue(props.initial.footer_datetime)
  );

  const [requesterType, setRequesterType] = useState<"company" | "direct">(
    isCompanyUser ? "company" : props.initial.requester_type
  );
  const [companyId, setCompanyId] = useState(props.initial.company_id ?? "");
  const [directCustomerName, setDirectCustomerName] = useState(
    props.initial.direct_customer_name ?? ""
  );
  const [directCustomerPhone, setDirectCustomerPhone] = useState(
    props.initial.direct_customer_phone ?? ""
  );

  const [priceAmount, setPriceAmount] = useState(
    String(props.initial.price_amount ?? "")
  );
  const [priceCurrency, setPriceCurrency] = useState(
    String(props.initial.price_currency ?? "")
  );

  const canSubmit = useMemo(() => {
    return (
      ownerFullName.trim().length > 0 &&
      ownerIdentityNo.trim().length > 0 &&
      ownerBirthDate.trim().length > 0 &&
      universityName.trim().length > 0 &&
      issueDate.trim().length > 0 &&
      footerDatetime.trim().length > 0 &&
      priceCurrency.trim().length > 0
    );
  }, [
    ownerFullName,
    ownerIdentityNo,
    ownerBirthDate,
    universityName,
    issueDate,
    footerDatetime,
    priceCurrency,
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setSaving(true);
    try {
      const body = {
        owner_full_name: ownerFullName,
        owner_identity_no: ownerIdentityNo,
        owner_birth_date: ownerBirthDate,
        university_name: universityName,
        dorm_name: dormName || null,
        dorm_address: dormAddress || null,
        issue_date: issueDate,
        footer_datetime: footerDatetime,
        requester_type: isCompanyUser ? "company" : requesterType,
        // For company users, server derives company_id from session.
        company_id: isCompanyUser
          ? null
          : requesterType === "company"
          ? companyId
          : null,
        direct_customer_name: isCompanyUser
          ? null
          : requesterType === "direct"
          ? directCustomerName
          : null,
        direct_customer_phone: isCompanyUser
          ? null
          : requesterType === "direct"
          ? directCustomerPhone
          : null,
        price_amount: Number(priceAmount),
        price_currency: priceCurrency,

        // Keep template fields unchanged.
        template_id: props.initial.template_id ?? null,
        template_version: props.initial.template_version ?? null,
        template_values: props.initial.template_values ?? null,
      };

      const res = await fetch(
        `/api/documents/${encodeURIComponent(props.initial.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        errorCode?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? t("errors.saveFailed"));
        return;
      }

      window.location.href = `/documents/${props.initial.id}`;
    } catch {
      setError(t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
        <div className="grid gap-1">
          <div className="text-xs text-muted-foreground">
            {tNew("fields.name")}
          </div>
          <Input
            value={ownerFullName}
            onChange={(e) => setOwnerFullName(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <div className="text-xs text-muted-foreground">
            {tNew("fields.idNumber")}
          </div>
          <Input
            value={ownerIdentityNo}
            onChange={(e) => setOwnerIdentityNo(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <div className="text-xs text-muted-foreground">
            {tNew("fields.birthDate")}
          </div>
          <Input
            type="date"
            value={ownerBirthDate}
            onChange={(e) => setOwnerBirthDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <div className="text-xs text-muted-foreground">
            {tNew("fields.university")}
          </div>
          <UniversityCombobox
            value={universityName}
            required
            onChange={setUniversityName}
          />
        </div>
        <div className="grid gap-1">
          <div className="text-xs text-muted-foreground">
            {tNew("fields.accommodation")}
          </div>
          <Input
            value={dormName}
            onChange={(e) => setDormName(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <div className="text-xs text-muted-foreground">
            {tNew("fields.address")}
          </div>
          <Input
            value={dormAddress}
            onChange={(e) => setDormAddress(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <div className="text-xs text-muted-foreground">
            {tNew("fields.issueDate")}
          </div>
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <div className="text-xs text-muted-foreground">
            {tNew("fields.footerDatetime")}
          </div>
          <Input
            type="datetime-local"
            value={footerDatetime}
            onChange={(e) => setFooterDatetime(e.target.value)}
          />
        </div>
      </section>

      {!isCompanyUser ? (
        <section className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">
              {tNew("fields.requesterType")}
            </div>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm [&>option]:bg-background [&>option]:text-foreground"
              value={requesterType}
              onChange={(e) =>
                setRequesterType(e.target.value as "company" | "direct")
              }
            >
              <option value="direct">{tNew("fields.requesterDirect")}</option>
              <option value="company">{tNew("fields.requesterCompany")}</option>
            </select>
          </div>

          {requesterType === "company" ? (
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">
                {tNew("fields.companyId")}
              </div>
              <Input
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">
                  {tNew("fields.customerName")}
                </div>
                <Input
                  value={directCustomerName}
                  onChange={(e) => setDirectCustomerName(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">
                  {tNew("fields.customerPhone")}
                </div>
                <Input
                  value={directCustomerPhone}
                  onChange={(e) => setDirectCustomerPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">
              {tNew("fields.amount")}
            </div>
            <Input
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">
              {tNew("fields.currency")}
            </div>
            <Input
              value={priceCurrency}
              onChange={(e) => setPriceCurrency(e.target.value)}
            />
          </div>
        </section>
      ) : null}

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="secondary">
          <a href={`/documents/${props.initial.id}`}>{t("actions.cancel")}</a>
        </Button>
        <Button type="submit" disabled={!canSubmit || saving}>
          {saving ? t("actions.saving") : t("actions.save")}
        </Button>
      </div>
    </form>
  );
}
