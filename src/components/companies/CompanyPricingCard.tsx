"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type TemplateListItem = {
  id: string;
  name: string;
  language: string;
  latest_version: number | null;
};

type PriceRow = {
  company_id: string;
  template_id: string;
  template_name: string;
  price_amount: string;
  price_currency: string;
  updated_at: string;
};

export function CompanyPricingCard(props: { companyId: string }) {
  const t = useTranslations("companies.pricing");
  const locale = useLocale();

  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [defaultAmount, setDefaultAmount] = useState("0");
  const [defaultCurrency, setDefaultCurrency] = useState("TRY");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingDefault, setSavingDefault] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);

  const rowMap = useMemo(() => {
    const m = new Map<string, PriceRow>();
    for (const r of rows) m.set(r.template_id, r);
    return m;
  }, [rows]);

  useEffect(() => {
    let cancelled = false;

    type TemplatesResponse =
      | { ok: true; rows: TemplateListItem[] }
      | { ok: false; error?: string };
    type PricesResponse =
      | { ok: true; rows: PriceRow[] }
      | { ok: false; error?: string };
    type PricingSettingsResponse =
      | {
          ok: true;
          settings: {
            default_price_amount: string;
            default_price_currency: string;
          };
        }
      | { ok: false; error?: string };

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [tplRes, pricesRes, settingsRes] = await Promise.all([
          fetch(`/api/templates?active=1`, { cache: "no-store" }),
          fetch(
            `/api/companies/${encodeURIComponent(props.companyId)}/pricing`,
            {
              cache: "no-store",
            }
          ),
          fetch(`/api/pricing`, { cache: "no-store" }),
        ]);

        const tplJson = (await tplRes
          .json()
          .catch(() => null)) as TemplatesResponse | null;
        const pricesJson = (await pricesRes
          .json()
          .catch(() => null)) as PricesResponse | null;
        const settingsJson = (await settingsRes
          .json()
          .catch(() => null)) as PricingSettingsResponse | null;

        if (cancelled) return;

        if (!tplJson || tplJson.ok !== true) {
          setError(t("errors.loadFailed"));
          return;
        }

        setTemplates(tplJson.rows ?? []);
        setRows(pricesJson?.ok === true ? pricesJson.rows ?? [] : []);

        if (settingsJson?.ok === true) {
          setDefaultAmount(settingsJson.settings.default_price_amount ?? "0");
          setDefaultCurrency(
            settingsJson.settings.default_price_currency ?? "TRY"
          );
        }
      } catch {
        if (!cancelled) setError(t("errors.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [props.companyId, t]);

  async function saveDefault() {
    setError(null);
    setSavingDefault(true);
    try {
      const amount = Number(defaultAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        setError(t("errors.amountInvalid"));
        return;
      }

      const res = await fetch(`/api/pricing`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          default_price_amount: amount,
          default_price_currency: defaultCurrency.trim() || "TRY",
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | {
            ok: true;
            settings: {
              default_price_amount: string;
              default_price_currency: string;
            };
          }
        | { ok: false; errorCode?: string }
        | null;

      if (!data || data.ok !== true) {
        const code = data?.ok === false ? data.errorCode : undefined;
        if (code === "amountInvalid") {
          setError(t("errors.amountInvalid"));
          return;
        }
        setError(t("errors.saveFailed"));
        return;
      }

      setDefaultAmount(data.settings.default_price_amount ?? defaultAmount);
      setDefaultCurrency(
        data.settings.default_price_currency ?? defaultCurrency
      );
    } catch {
      setError(t("errors.saveFailed"));
    } finally {
      setSavingDefault(false);
    }
  }

  async function saveTemplatePrice(templateId: string, amountRaw: string) {
    setError(null);
    setSavingTemplate(templateId);
    try {
      const amount = Number(amountRaw);
      if (!Number.isFinite(amount) || amount < 0) {
        setError(t("errors.amountInvalid"));
        return;
      }

      const res = await fetch(
        `/api/companies/${encodeURIComponent(props.companyId)}/pricing`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            template_id: templateId,
            price_amount: amount,
            price_currency: defaultCurrency.trim() || "TRY",
          }),
        }
      );

      const data = (await res.json().catch(() => null)) as
        | { ok: true; row: PriceRow }
        | { ok: false; errorCode?: string }
        | null;

      if (!data || data.ok !== true) {
        const code = data?.ok === false ? data.errorCode : undefined;
        if (code === "amountInvalid") {
          setError(t("errors.amountInvalid"));
          return;
        }
        setError(t("errors.saveFailed"));
        return;
      }

      const row = data.row;
      setRows((prev) => {
        const next = prev.filter((r) => r.template_id !== row.template_id);
        next.push(row);
        next.sort((a, b) =>
          a.template_name.localeCompare(b.template_name, locale)
        );
        return next;
      });
    } catch {
      setError(t("errors.saveFailed"));
    } finally {
      setSavingTemplate(null);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <div className="text-sm font-medium">{t("title")}</div>
        <div className="text-xs text-muted-foreground">{t("subtitle")}</div>
      </div>

      <div className="rounded-md border border-border bg-background p-3">
        <div className="text-sm font-medium">{t("default.title")}</div>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">
              {t("default.amount")}
            </div>
            <Input
              value={defaultAmount}
              onChange={(e) => setDefaultAmount(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {t("default.currency")}
            </div>
            <Input
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <Button type="button" onClick={saveDefault} disabled={savingDefault}>
            {savingDefault ? t("actions.saving") : t("actions.saveDefault")}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">{t("table.template")}</th>
              <th className="px-3 py-2">{t("table.price")}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={3}>
                  {t("loading")}
                </td>
              </tr>
            ) : templates.length ? (
              templates.map((tpl) => {
                const existing = rowMap.get(tpl.id);
                const value = existing?.price_amount ?? "";
                const rowKey = `${tpl.id}-${existing?.updated_at ?? "none"}`;

                return (
                  <TemplatePriceRow
                    key={rowKey}
                    templateId={tpl.id}
                    templateName={tpl.name}
                    initialAmount={value}
                    saving={savingTemplate === tpl.id}
                    onSave={(amount) => saveTemplatePrice(tpl.id, amount)}
                    t={t}
                  />
                );
              })
            ) : (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={3}>
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplatePriceRow(props: {
  templateId: string;
  templateName: string;
  initialAmount: string;
  saving: boolean;
  onSave: (amount: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [amount, setAmount] = useState(props.initialAmount);

  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="px-3 py-2 font-medium">{props.templateName}</td>
      <td className="px-3 py-2">
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
      </td>
      <td className="px-3 py-2 text-right">
        <Button
          type="button"
          variant="secondary"
          disabled={props.saving}
          onClick={() => props.onSave(amount)}
        >
          {props.saving ? props.t("actions.saving") : props.t("actions.save")}
        </Button>
      </td>
    </tr>
  );
}
