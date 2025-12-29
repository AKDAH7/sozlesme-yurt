"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { DocStatus, PaymentMethod, TrackingStatus } from "@/types/db";

type TrackingHistoryRow = {
  id: string;
  document_id: string;
  from_status: TrackingStatus | null;
  to_status: TrackingStatus;
  changed_by_user_id: string;
  changed_by_full_name: string;
  changed_at: string;
  note: string | null;
};

type PaymentRow = {
  id: string;
  document_id: string;
  received_amount: string;
  currency: string;
  method: PaymentMethod;
  payment_date: string;
  received_by_user_id: string;
  received_by_full_name: string;
  receipt_no: string | null;
  note: string | null;
  created_at: string;
};

type PaymentSummary = {
  price_amount: string;
  price_currency: string;
  paid_amount: string;
  remaining_amount: string;
  payment_status: "unpaid" | "partial" | "paid";
};

const TRACKING_OPTIONS: TrackingStatus[] = [
  "created",
  "residence_file_delivered",
  "residence_file_received",
  "shipped",
  "received",
  "delivered_to_student",
  "delivered_to_agent",
  "cancelled",
];

const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "card",
  "other",
];

function TrackingStatusCombobox(props: {
  label: string;
  value: TrackingStatus;
  onChange: (next: TrackingStatus) => void;
  options: TrackingStatus[];
  optionLabel: (s: TrackingStatus) => string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
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
    <div className="grid gap-1" ref={wrapperRef}>
      <div className="text-xs text-muted-foreground">{props.label}</div>
      <div className="relative">
        <Input
          value={props.optionLabel(props.value)}
          readOnly
          disabled={props.disabled}
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
            className="absolute left-0 right-0 z-50 mt-1 max-h-56 w-full max-w-full overflow-auto overflow-x-hidden rounded-md border border-border bg-background shadow-sm"
          >
            {props.options.map((s) => (
              <button
                key={s}
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-muted",
                  s === props.value
                    ? "bg-muted/50 text-foreground"
                    : "text-foreground"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  props.onChange(s);
                  setOpen(false);
                }}
              >
                <span className="block truncate">{props.optionLabel(s)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SelectNative(
  props: React.ComponentProps<"select"> & { hasError?: boolean }
) {
  const { className, hasError, ...rest } = props;
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border bg-background px-3 py-1 text-base text-foreground shadow-sm transition-colors [&>option]:bg-background [&>option]:text-foreground",
        "border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        hasError ? "border-destructive" : "",
        className
      )}
      {...rest}
    />
  );
}

function fmtDateTime(value: string): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value;
  return d.toLocaleString();
}

function fmtDate(value: string): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value;
  return d.toLocaleDateString();
}

export function DocumentManagementPanel(props: {
  documentId: string;
  initialDocStatus: DocStatus;
  initialTrackingStatus: TrackingStatus;
  priceAmount: string;
  priceCurrency: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations();
  const tDocStatus = useTranslations("status.document");
  const tTracking = useTranslations("status.tracking");
  const tPaymentMethod = useTranslations("status.paymentMethod");

  const [docStatus, setDocStatus] = React.useState<DocStatus>(
    props.initialDocStatus
  );
  const [trackingStatus, setTrackingStatus] = React.useState<TrackingStatus>(
    props.initialTrackingStatus
  );

  const [history, setHistory] = React.useState<TrackingHistoryRow[]>([]);
  const [payments, setPayments] = React.useState<PaymentRow[]>([]);
  const [summary, setSummary] = React.useState<PaymentSummary | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [toTrackingStatus, setToTrackingStatus] =
    React.useState<TrackingStatus>(props.initialTrackingStatus);
  const [trackingNote, setTrackingNote] = React.useState("");

  const [showAddPayment, setShowAddPayment] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState<string>("");
  const [paymentMethod, setPaymentMethod] =
    React.useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = React.useState<string>("");
  const [receiptNo, setReceiptNo] = React.useState<string>("");
  const [paymentNote, setPaymentNote] = React.useState<string>("");

  const currency = props.priceCurrency;
  const canManage = props.canManage !== false;

  async function loadTrackingHistory() {
    const res = await fetch(`/api/documents/${props.documentId}/tracking`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: true; history: TrackingHistoryRow[] }
      | { ok: false; error?: string; errorCode?: string }
      | null;

    if (!res.ok || !json || json.ok !== true) {
      const code = json && "errorCode" in json ? json.errorCode : undefined;
      const message = json && "error" in json ? json.error ?? "" : "";
      throw new Error(code || message);
    }

    setHistory(json.history);
  }

  async function loadPayments() {
    const res = await fetch(`/api/documents/${props.documentId}/payments`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: true; summary: PaymentSummary; payments: PaymentRow[] }
      | { ok: false; error?: string; errorCode?: string }
      | null;

    if (!res.ok || !json || json.ok !== true) {
      const code = json && "errorCode" in json ? json.errorCode : undefined;
      const message = json && "error" in json ? json.error ?? "" : "";
      throw new Error(code || message);
    }

    setSummary(json.summary);
    setPayments(json.payments);
  }

  async function reloadAll() {
    setError(null);
    setLoading(true);
    try {
      await Promise.all([loadTrackingHistory(), loadPayments()]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "notFound") {
        setError(t("documents.details.managementPanel.errors.notFound"));
      } else if (msg === "forbidden") {
        setError(t("documents.details.managementPanel.errors.forbidden"));
      } else if (msg === "listTrackingFailed" || msg === "listPaymentsFailed") {
        setError(t("documents.details.managementPanel.errors.loadFailed"));
      } else {
        setError(
          msg || t("documents.details.managementPanel.errors.loadFailed")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.documentId]);

  async function toggleDocStatus() {
    setError(null);
    const next: DocStatus = docStatus === "active" ? "inactive" : "active";

    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${props.documentId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc_status: next }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; doc_status: DocStatus }
        | { ok: false; error?: string; errorCode?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        const code = json && "errorCode" in json ? json.errorCode : undefined;
        const message = json && "error" in json ? json.error ?? "" : "";
        throw new Error(code || message);
      }

      setDocStatus(json.doc_status);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "invalidDocStatus") {
        setError(
          t("documents.details.managementPanel.errors.invalidDocStatus")
        );
      } else if (msg === "notFound") {
        setError(t("documents.details.managementPanel.errors.notFound"));
      } else if (msg === "forbidden") {
        setError(t("documents.details.managementPanel.errors.forbidden"));
      } else if (msg === "updateStatusFailed") {
        setError(
          t("documents.details.managementPanel.errors.updateStatusFailed")
        );
      } else {
        setError(
          msg ||
            t("documents.details.managementPanel.errors.updateStatusFailed")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitTrackingUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/documents/${props.documentId}/tracking`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to_status: toTrackingStatus,
          note: trackingNote.trim() ? trackingNote.trim() : null,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; tracking_status: TrackingStatus }
        | { ok: false; error?: string; errorCode?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        const code = json && "errorCode" in json ? json.errorCode : undefined;
        const message = json && "error" in json ? json.error ?? "" : "";
        throw new Error(code || message);
      }

      setTrackingStatus(json.tracking_status);
      setTrackingNote("");
      await loadTrackingHistory();
      router.refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : "";
      if (msg === "invalidTrackingStatus") {
        setError(
          t("documents.details.managementPanel.errors.invalidTrackingStatus")
        );
      } else if (msg === "notFound") {
        setError(t("documents.details.managementPanel.errors.notFound"));
      } else if (msg === "forbidden") {
        setError(t("documents.details.managementPanel.errors.forbidden"));
      } else if (msg === "updateTrackingFailed") {
        setError(
          t("documents.details.managementPanel.errors.updateTrackingFailed")
        );
      } else {
        setError(
          msg ||
            t("documents.details.managementPanel.errors.updateTrackingFailed")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const receivedAmount = Number(paymentAmount);
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      setError(
        t(
          "documents.details.managementPanel.errors.amountMustBeGreaterThanZero"
        )
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${props.documentId}/payments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          received_amount: receivedAmount,
          currency,
          method: paymentMethod,
          payment_date: paymentDate || undefined,
          receipt_no: receiptNo.trim() ? receiptNo.trim() : undefined,
          note: paymentNote.trim() ? paymentNote.trim() : undefined,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | {
            ok: true;
            summary: PaymentSummary;
            payments: PaymentRow[];
          }
        | { ok: false; error?: string; errorCode?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        const code = json && "errorCode" in json ? json.errorCode : undefined;
        const message = json && "error" in json ? json.error ?? "" : "";
        throw new Error(code || message);
      }

      setSummary(json.summary);
      setPayments(json.payments);
      setPaymentAmount("");
      setPaymentDate("");
      setReceiptNo("");
      setPaymentNote("");
      setShowAddPayment(false);
      router.refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : "";
      if (msg === "invalidAmount") {
        setError(
          t(
            "documents.details.managementPanel.errors.amountMustBeGreaterThanZero"
          )
        );
      } else if (msg === "invalidCurrency") {
        setError(t("documents.details.managementPanel.errors.invalidCurrency"));
      } else if (msg === "invalidPaymentMethod") {
        setError(
          t("documents.details.managementPanel.errors.invalidPaymentMethod")
        );
      } else if (msg === "invalidPaymentDate") {
        setError(
          t("documents.details.managementPanel.errors.invalidPaymentDate")
        );
      } else if (msg === "notFound") {
        setError(t("documents.details.managementPanel.errors.notFound"));
      } else if (msg === "forbidden") {
        setError(t("documents.details.managementPanel.errors.forbidden"));
      } else if (msg === "addPaymentFailed") {
        setError(
          t("documents.details.managementPanel.errors.addPaymentFailed")
        );
      } else {
        setError(
          msg || t("documents.details.managementPanel.errors.addPaymentFailed")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">
              {t("documents.details.managementPanel.status.title")}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("documents.details.managementPanel.current")}:{" "}
              <span className="font-medium">{tDocStatus(docStatus)}</span>
            </div>
          </div>
          {canManage ? (
            <Button
              type="button"
              variant={docStatus === "active" ? "secondary" : "default"}
              onClick={() => void toggleDocStatus()}
              disabled={loading}
            >
              {docStatus === "active"
                ? t("documents.details.managementPanel.status.deactivate")
                : t("documents.details.managementPanel.status.activate")}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <div className="text-sm font-medium">
              {t("documents.details.managementPanel.tracking.title")}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("documents.details.managementPanel.current")}:</span>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                {tTracking(trackingStatus)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void reloadAll()}
            disabled={loading}
          >
            {t("documents.details.managementPanel.refresh")}
          </Button>
        </div>

        {canManage ? (
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={submitTrackingUpdate}
          >
            <TrackingStatusCombobox
              label={t("documents.details.managementPanel.tracking.newStatus")}
              value={toTrackingStatus}
              onChange={setToTrackingStatus}
              options={TRACKING_OPTIONS}
              optionLabel={tTracking}
              disabled={loading}
            />

            <div className="grid gap-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">
                {t("documents.details.managementPanel.note")}
              </div>
              <Input
                value={trackingNote}
                onChange={(e) => setTrackingNote(e.target.value)}
                placeholder={t("documents.details.managementPanel.optional")}
                disabled={loading}
              />
            </div>

            <div className="flex items-end md:col-span-1">
              <Button type="submit" disabled={loading} className="w-full">
                {t("documents.details.managementPanel.tracking.update")}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">
                  {t("documents.details.managementPanel.tracking.table.when")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("documents.details.managementPanel.tracking.table.from")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("documents.details.managementPanel.tracking.table.to")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("documents.details.managementPanel.tracking.table.by")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("documents.details.managementPanel.tracking.table.note")}
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {fmtDateTime(h.changed_at)}
                  </td>
                  <td className="px-3 py-2">
                    {h.from_status ? tTracking(h.from_status) : "—"}
                  </td>
                  <td className="px-3 py-2">{tTracking(h.to_status)}</td>
                  <td className="px-3 py-2">{h.changed_by_full_name}</td>
                  <td className="px-3 py-2">{h.note ?? "—"}</td>
                </tr>
              ))}

              {history.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    {t("documents.details.managementPanel.tracking.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">
              {t("documents.details.managementPanel.payments.title")}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("documents.details.managementPanel.payments.currency")}:{" "}
              <span className="font-medium">{currency}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManage ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddPayment((v) => !v)}
                disabled={loading}
              >
                {showAddPayment
                  ? t("documents.details.managementPanel.close")
                  : t("documents.details.managementPanel.payments.addPayment")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-border px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {t("documents.details.managementPanel.payments.summary.price")}
            </div>
            <div className="text-sm font-medium">
              {props.priceAmount} {currency}
            </div>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {t("documents.details.managementPanel.payments.summary.paid")}
            </div>
            <div className="text-sm font-medium">
              {summary?.paid_amount ?? "0"} {currency}
            </div>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {t(
                "documents.details.managementPanel.payments.summary.remaining"
              )}
            </div>
            <div className="text-sm font-medium">
              {summary?.remaining_amount ?? props.priceAmount} {currency}
            </div>
          </div>
        </div>

        {canManage && showAddPayment ? (
          <form className="grid gap-3 md:grid-cols-3" onSubmit={submitPayment}>
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">
                {t("documents.details.managementPanel.payments.form.amount")}
              </div>
              <Input
                inputMode="decimal"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                disabled={loading}
              />
            </div>

            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">
                {t("documents.details.managementPanel.payments.form.method")}
              </div>
              <SelectNative
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                disabled={loading}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {tPaymentMethod(m)}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">
                {t(
                  "documents.details.managementPanel.payments.form.paymentDate"
                )}
              </div>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid gap-1 md:col-span-1">
              <div className="text-xs text-muted-foreground">
                {t("documents.details.managementPanel.payments.form.receiptNo")}
              </div>
              <Input
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                placeholder={t("documents.details.managementPanel.optional")}
                disabled={loading}
              />
            </div>

            <div className="grid gap-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">
                {t("documents.details.managementPanel.note")}
              </div>
              <Input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder={t("documents.details.managementPanel.optional")}
                disabled={loading}
              />
            </div>

            <div className="md:col-span-3">
              <Button type="submit" disabled={loading}>
                {t("documents.details.managementPanel.payments.form.save")}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">
                  {t("documents.details.managementPanel.payments.table.date")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("documents.details.managementPanel.payments.table.amount")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("documents.details.managementPanel.payments.table.method")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t(
                    "documents.details.managementPanel.payments.table.receipt"
                  )}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("documents.details.managementPanel.payments.table.by")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("documents.details.managementPanel.payments.table.note")}
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {fmtDate(p.payment_date)}
                  </td>
                  <td className="px-3 py-2">
                    {p.received_amount} {p.currency}
                  </td>
                  <td className="px-3 py-2">{tPaymentMethod(p.method)}</td>
                  <td className="px-3 py-2">{p.receipt_no ?? "—"}</td>
                  <td className="px-3 py-2">{p.received_by_full_name}</td>
                  <td className="px-3 py-2">{p.note ?? "—"}</td>
                </tr>
              ))}

              {payments.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    {t("documents.details.managementPanel.payments.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
