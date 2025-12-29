"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { ReportsCards } from "@/components/reports/ReportsCards";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { DocumentListRow } from "@/lib/db/queries/documents";
import type { PaymentMethod } from "@/types/db";

type SelectionSummary = {
  total_documents: number;
  total_sales: string;
  total_collected: string;
  remaining: string;
};

export function AccountingClient(props: {
  role: string;
  companies: Array<{ id: string; company_name: string }>;
  initialCompanyId: string | null;
  initialPaymentGroup: "" | "paid" | "unpaid";
  initialFrom: string | null;
  initialTo: string | null;
  page: number;
  pageSize: number;
  total: number;
  summary: SelectionSummary;
  documents: DocumentListRow[];
}) {
  const t = useTranslations("accounting.page");
  const tStatus = useTranslations("status");
  const tMethod = useTranslations("status.paymentMethod");
  const locale = useLocale();

  const [filterCompanyId, setFilterCompanyId] = useState<string>(
    props.initialCompanyId ?? ""
  );
  const [filterPaymentGroup, setFilterPaymentGroup] = useState<
    "" | "paid" | "unpaid"
  >(props.initialPaymentGroup);
  const [filterFrom, setFilterFrom] = useState<string>(props.initialFrom ?? "");
  const [filterTo, setFilterTo] = useState<string>(props.initialTo ?? "");
  const [page, setPage] = useState<number>(props.page);
  const [pageSize, setPageSize] = useState<number>(props.pageSize);

  const [docRows, setDocRows] = useState<DocumentListRow[]>(props.documents);
  const [docTotal, setDocTotal] = useState<number>(props.total);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [reloadDocsSeq, setReloadDocsSeq] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSummary, setSelectedSummary] =
    useState<SelectionSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payDate, setPayDate] = useState<string>("");
  const [payReceiptNo, setPayReceiptNo] = useState<string>("");
  const [payNote, setPayNote] = useState<string>("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const idsArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.size;

  const selectedDocuments = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return docRows.filter((d) => selectedIds.has(d.id));
  }, [docRows, selectedIds]);

  const { selectedCurrency, hasMixedCurrencies } = useMemo(() => {
    const currencies = new Set(
      selectedDocuments.map((d) => d.price_currency).filter(Boolean)
    );

    if (currencies.size === 1) {
      return {
        selectedCurrency: Array.from(currencies)[0] as string,
        hasMixedCurrencies: false,
      };
    }

    return {
      selectedCurrency: "",
      hasMixedCurrencies: currencies.size > 1,
    };
  }, [selectedDocuments]);

  const selectedDocument = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    const onlyId = idsArray[0];
    return docRows.find((d) => d.id === onlyId) ?? null;
  }, [docRows, idsArray, selectedIds.size]);

  const canSubmitPayment =
    selectedCount > 0 &&
    !hasMixedCurrencies &&
    Number.isFinite(Number(payAmount)) &&
    Number(payAmount) > 0 &&
    !payLoading;

  const formatMoney = (value: string) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const allVisibleSelected =
    docRows.length > 0 && selectedIds.size === docRows.length;

  const canPrev = page > 1;
  const canNext = page * pageSize < docTotal;

  useEffect(() => {
    if (idsArray.length === 0) {
      setSelectedSummary(null);
      return;
    }

    const ac = new AbortController();
    setIsLoadingSummary(true);

    (async () => {
      const res = await fetch("/api/accounting/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentIds: idsArray }),
        signal: ac.signal,
      }).catch(() => null);

      if (!res || !res.ok) {
        if (!ac.signal.aborted) setSelectedSummary(null);
        return;
      }

      const data = (await res.json().catch(() => null)) as
        | { ok: true; summary: SelectionSummary }
        | { ok: false }
        | null;

      if (!ac.signal.aborted && data && "ok" in data && data.ok === true) {
        setSelectedSummary(data.summary);
      }
    })()
      .catch(() => null)
      .finally(() => {
        if (!ac.signal.aborted) setIsLoadingSummary(false);
      });

    return () => {
      ac.abort();
    };
  }, [idsArray]);

  useEffect(() => {
    // Keep internal state in sync if user navigates to /accounting with different params.
    setFilterCompanyId(props.initialCompanyId ?? "");
    setFilterPaymentGroup(props.initialPaymentGroup);
    setFilterFrom(props.initialFrom ?? "");
    setFilterTo(props.initialTo ?? "");
    setPage(props.page);
    setPageSize(props.pageSize);
    setDocRows(props.documents);
    setDocTotal(props.total);
    setSelectedIds(new Set());
  }, [
    props.initialCompanyId,
    props.initialPaymentGroup,
    props.initialFrom,
    props.initialTo,
    props.page,
    props.pageSize,
    props.documents,
    props.total,
  ]);

  useEffect(() => {
    const ac = new AbortController();
    setIsLoadingDocs(true);
    setDocsError(null);

    (async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (filterCompanyId) params.set("company_id", filterCompanyId);
      if (filterPaymentGroup) params.set("payment_group", filterPaymentGroup);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);

      const res = await fetch(
        `/api/accounting/documents?${params.toString()}`,
        { signal: ac.signal }
      ).catch(() => null);

      if (!res || !res.ok) {
        if (!ac.signal.aborted) {
          setDocsError(t("documents.loadFailed"));
        }
        return;
      }

      const data = (await res.json().catch(() => null)) as
        | { ok: true; rows: DocumentListRow[]; total: number }
        | { ok: false; error?: string }
        | null;

      if (!ac.signal.aborted && data && (data as any).ok === true) {
        setDocRows((data as any).rows ?? []);
        setDocTotal(Number((data as any).total ?? 0));
        setDocsError(null);
        setSelectedIds(new Set());
      } else if (!ac.signal.aborted) {
        setDocsError(
          typeof (data as any)?.error === "string"
            ? (data as any).error
            : t("documents.loadFailed")
        );
      }
    })()
      .catch(() => null)
      .finally(() => {
        if (!ac.signal.aborted) setIsLoadingDocs(false);
      });

    return () => ac.abort();
  }, [
    filterCompanyId,
    filterFrom,
    filterPaymentGroup,
    filterTo,
    page,
    pageSize,
    reloadDocsSeq,
    t,
  ]);

  const activeSummary = selectedSummary ?? props.summary;

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return new Set();
      return new Set(docRows.map((d) => d.id));
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function submitPayment() {
    setPayError(null);
    setPaySuccess(null);

    if (selectedCount < 1) {
      setPayError(t("receivePayment.errors.selectAtLeastOne"));
      return;
    }

    if (hasMixedCurrencies || !selectedCurrency) {
      setPayError(t("receivePayment.errors.mixedCurrencies"));
      return;
    }

    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError(t("receivePayment.errors.invalidAmount"));
      return;
    }

    setPayLoading(true);
    try {
      const ids = idsArray;
      const res =
        ids.length === 1
          ? await fetch(
              `/api/documents/${encodeURIComponent(ids[0])}/payments`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  received_amount: amount,
                  currency: selectedCurrency,
                  method: payMethod,
                  payment_date: payDate || undefined,
                  receipt_no: payReceiptNo || undefined,
                  note: payNote || undefined,
                }),
              }
            )
          : await fetch(`/api/accounting/payments/bulk`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                documentIds: ids,
                received_amount: amount,
                currency: selectedCurrency,
                method: payMethod,
                payment_date: payDate || undefined,
                receipt_no: payReceiptNo || undefined,
                note: payNote || undefined,
              }),
            });

      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok || !data) {
        setPayError(
          typeof data?.error === "string"
            ? data.error
            : t("receivePayment.errors.failed")
        );
        return;
      }

      if (ids.length === 1) {
        if (data.ok !== true) {
          setPayError(
            typeof data?.error === "string"
              ? data.error
              : t("receivePayment.errors.failed")
          );
          return;
        }
        setPaySuccess(t("receivePayment.success"));
        setSelectedIds(new Set());
      } else {
        const okCount = Number(data?.okCount ?? 0);
        const failedCount = Number(data?.failedCount ?? 0);

        setPaySuccess(
          t("receivePayment.successBulk", {
            okCount,
            failedCount,
          })
        );

        if (failedCount === 0) {
          setSelectedIds(new Set());
        }
      }

      setPayAmount("");
      setPayReceiptNo("");
      setPayNote("");
      // Re-fetch current page rows without triggering a full page navigation.
      setReloadDocsSeq((v) => v + 1);
    } catch {
      setPayError(t("receivePayment.errors.failed"));
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="text-xs text-muted-foreground">
            {t("filters.company")}
          </div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            value={filterCompanyId}
            onChange={(e) => {
              setPage(1);
              setFilterCompanyId(e.target.value);
            }}
          >
            <option value="">{t("filters.allCompanies")}</option>
            {props.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">
            {t("filters.payment")}
          </div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            value={filterPaymentGroup}
            onChange={(e) => {
              setPage(1);
              setFilterPaymentGroup(e.target.value as any);
            }}
          >
            <option value="">{t("filters.all")}</option>
            <option value="paid">{tStatus("payment.paid")}</option>
            <option value="unpaid">{tStatus("payment.unpaid")}</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">
            {t("filters.from")}
          </div>
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => {
              setPage(1);
              setFilterFrom(e.target.value);
            }}
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">{t("filters.to")}</div>
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => {
              setPage(1);
              setFilterTo(e.target.value);
            }}
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">
            {t("filters.pageSize")}
          </div>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            )}
            value={String(pageSize)}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="40">40</option>
            <option value="50">50</option>
          </select>
        </div>

        <div className="md:col-span-12 flex items-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedIds.size === 0}
          >
            {t("actions.clearSelection")}
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {selectedIds.size
              ? t("selection.selected", { count: selectedIds.size })
              : t("selection.none")}
            {isLoadingSummary ? ` · ${t("selection.calculating")}` : ""}
          </div>
        </div>
      </div>

      <ReportsCards summary={activeSummary} />

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium">{t("receivePayment.title")}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {selectedCount === 1 && selectedDocument
            ? t("receivePayment.subtitleSelected", {
                referenceNo: selectedDocument.reference_no,
              })
            : selectedCount > 1
            ? t("receivePayment.subtitleSelectedMany", { count: selectedCount })
            : t("receivePayment.subtitle")}
        </div>

        {payError ? (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            {payError}
          </div>
        ) : null}

        {paySuccess ? (
          <div className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
            {paySuccess}
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">
              {t("receivePayment.fields.amountPerDocument")}
            </div>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              disabled={selectedCount === 0 || hasMixedCurrencies || payLoading}
              placeholder={selectedCurrency}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">
              {t("receivePayment.fields.method")}
            </div>
            <select
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              )}
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              disabled={selectedCount === 0 || hasMixedCurrencies || payLoading}
            >
              <option value="cash">{tMethod("cash")}</option>
              <option value="bank_transfer">{tMethod("bank_transfer")}</option>
              <option value="card">{tMethod("card")}</option>
              <option value="other">{tMethod("other")}</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">
              {t("receivePayment.fields.date")}
            </div>
            <Input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              disabled={selectedCount === 0 || hasMixedCurrencies || payLoading}
            />
          </div>

          <div className="md:col-span-3">
            <div className="text-xs text-muted-foreground">
              {t("receivePayment.fields.receiptNo")}
            </div>
            <Input
              value={payReceiptNo}
              onChange={(e) => setPayReceiptNo(e.target.value)}
              disabled={selectedCount === 0 || hasMixedCurrencies || payLoading}
            />
          </div>

          <div className="md:col-span-3">
            <div className="text-xs text-muted-foreground">
              {t("receivePayment.fields.source")}
            </div>
            <Input
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              disabled={selectedCount === 0 || hasMixedCurrencies || payLoading}
            />
          </div>

          <div className="md:col-span-6 flex items-end gap-2">
            <Button
              type="button"
              onClick={() => void submitPayment()}
              disabled={!canSubmitPayment}
            >
              {payLoading
                ? t("receivePayment.actions.receiving")
                : t("receivePayment.actions.receive")}
            </Button>
            <div className="text-xs text-muted-foreground">
              {selectedCount > 0 && selectedCurrency
                ? t("receivePayment.currency", {
                    currency: selectedCurrency,
                  })
                : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{t("documents.title")}</div>
          <div className="text-xs text-muted-foreground">
            {t("documents.showing", { count: docRows.length })}
          </div>
        </div>

        {docsError ? (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            {docsError}
          </div>
        ) : null}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted-foreground">
                <th className="py-2 px-3">
                  <input
                    type="checkbox"
                    aria-label={t("documents.selectAll")}
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th className="py-2 px-3">
                  {t("documents.columns.reference")}
                </th>
                <th className="py-2 px-3">{t("documents.columns.owner")}</th>
                <th className="py-2 px-3">{t("documents.columns.company")}</th>
                <th className="py-2 px-3">{t("documents.columns.payment")}</th>
                <th className="py-2 px-3">{t("documents.columns.price")}</th>
                <th className="py-2 px-3">{t("documents.columns.created")}</th>
              </tr>
            </thead>
            <tbody>
              {docRows.length ? (
                docRows.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        aria-label={t("documents.select")}
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleOne(d.id)}
                      />
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">
                      <Link
                        className="hover:underline"
                        href={`/documents/${d.id}`}
                      >
                        {d.reference_no}
                      </Link>
                    </td>
                    <td className="py-2 px-3">{d.owner_full_name}</td>
                    <td className="py-2 px-3">
                      {d.company_name ?? d.direct_customer_name ?? "-"}
                    </td>
                    <td className="py-2 px-3">
                      {tStatus(`payment.${d.payment_status}`)}
                    </td>
                    <td className="py-2 px-3 font-medium">
                      {formatMoney(d.price_amount)} {d.price_currency}
                    </td>
                    <td className="py-2 px-3">
                      {new Date(d.created_at).toLocaleDateString(locale)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={7}>
                    {t("documents.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          disabled={!canPrev || isLoadingDocs}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t("pagination.prev")}
        </Button>

        <div className="text-sm text-muted-foreground">
          {t("pagination.page", { page })}
          {isLoadingDocs ? ` · ${t("documents.loading")}` : ""}
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={!canNext || isLoadingDocs}
          onClick={() => setPage((p) => p + 1)}
        >
          {t("pagination.next")}
        </Button>
      </div>
    </div>
  );
}
