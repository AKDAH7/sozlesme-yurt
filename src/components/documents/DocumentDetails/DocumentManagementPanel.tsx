"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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
  "shipped",
  "received",
  "delivered_to_student",
  "delivered_to_agent",
  "cancelled",
];

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

function SelectNative(
  props: React.ComponentProps<"select"> & { hasError?: boolean }
) {
  const { className, hasError, ...rest } = props;
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
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
}) {
  const router = useRouter();

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

  async function loadTrackingHistory() {
    const res = await fetch(`/api/documents/${props.documentId}/tracking`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: true; history: TrackingHistoryRow[] }
      | { ok: false; error?: string }
      | null;

    if (!res.ok || !json || json.ok !== true) {
      throw new Error(json && "error" in json ? json.error ?? "" : "");
    }

    setHistory(json.history);
  }

  async function loadPayments() {
    const res = await fetch(`/api/documents/${props.documentId}/payments`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: true; summary: PaymentSummary; payments: PaymentRow[] }
      | { ok: false; error?: string }
      | null;

    if (!res.ok || !json || json.ok !== true) {
      throw new Error(json && "error" in json ? json.error ?? "" : "");
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
      setError(msg || "Failed to load management data");
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
        | { ok: false; error?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        throw new Error(json && "error" in json ? json.error ?? "" : "");
      }

      setDocStatus(json.doc_status);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || "Failed to update status");
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
        | { ok: false; error?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        throw new Error(json && "error" in json ? json.error ?? "" : "");
      }

      setTrackingStatus(json.tracking_status);
      setTrackingNote("");
      await loadTrackingHistory();
      router.refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : "";
      setError(msg || "Failed to update tracking");
    } finally {
      setLoading(false);
    }
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const receivedAmount = Number(paymentAmount);
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      setError("Amount must be > 0");
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
        | { ok: false; error?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        throw new Error(json && "error" in json ? json.error ?? "" : "");
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
      setError(msg || "Failed to add payment");
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
            <div className="text-sm font-medium">Status</div>
            <div className="text-sm text-muted-foreground">
              Current: <span className="font-medium">{docStatus}</span>
            </div>
          </div>
          <Button
            type="button"
            variant={docStatus === "active" ? "secondary" : "default"}
            onClick={() => void toggleDocStatus()}
            disabled={loading}
          >
            {docStatus === "active" ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Tracking</div>
            <div className="text-sm text-muted-foreground">
              Current: <span className="font-medium">{trackingStatus}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void reloadAll()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={submitTrackingUpdate}
        >
          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">New status</div>
            <SelectNative
              value={toTrackingStatus}
              onChange={(e) =>
                setToTrackingStatus(e.target.value as TrackingStatus)
              }
              disabled={loading}
            >
              {TRACKING_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectNative>
          </div>

          <div className="grid gap-1 md:col-span-2">
            <div className="text-xs text-muted-foreground">Note</div>
            <Input
              value={trackingNote}
              onChange={(e) => setTrackingNote(e.target.value)}
              placeholder="Optional note"
              disabled={loading}
            />
          </div>

          <div className="md:col-span-3">
            <Button type="submit" disabled={loading}>
              Update Tracking
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-3 py-2 text-left font-medium">From</th>
                <th className="px-3 py-2 text-left font-medium">To</th>
                <th className="px-3 py-2 text-left font-medium">By</th>
                <th className="px-3 py-2 text-left font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {fmtDateTime(h.changed_at)}
                  </td>
                  <td className="px-3 py-2">{h.from_status ?? "-"}</td>
                  <td className="px-3 py-2">{h.to_status}</td>
                  <td className="px-3 py-2">{h.changed_by_full_name}</td>
                  <td className="px-3 py-2">{h.note ?? "-"}</td>
                </tr>
              ))}

              {history.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No tracking history.
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
            <div className="text-sm font-medium">Payments</div>
            <div className="text-sm text-muted-foreground">
              Currency: <span className="font-medium">{currency}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddPayment((v) => !v)}
              disabled={loading}
            >
              {showAddPayment ? "Close" : "Add Payment"}
            </Button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-border px-3 py-2">
            <div className="text-xs text-muted-foreground">Price</div>
            <div className="text-sm font-medium">
              {props.priceAmount} {currency}
            </div>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="text-sm font-medium">
              {summary?.paid_amount ?? "0"} {currency}
            </div>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="text-sm font-medium">
              {summary?.remaining_amount ?? props.priceAmount} {currency}
            </div>
          </div>
        </div>

        {showAddPayment ? (
          <form className="grid gap-3 md:grid-cols-3" onSubmit={submitPayment}>
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">Amount</div>
              <Input
                inputMode="decimal"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                disabled={loading}
              />
            </div>

            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">Method</div>
              <SelectNative
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                disabled={loading}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">Payment date</div>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid gap-1 md:col-span-1">
              <div className="text-xs text-muted-foreground">Receipt no</div>
              <Input
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                placeholder="Optional"
                disabled={loading}
              />
            </div>

            <div className="grid gap-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Note</div>
              <Input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Optional"
                disabled={loading}
              />
            </div>

            <div className="md:col-span-3">
              <Button type="submit" disabled={loading}>
                Save Payment
              </Button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Method</th>
                <th className="px-3 py-2 text-left font-medium">Receipt</th>
                <th className="px-3 py-2 text-left font-medium">By</th>
                <th className="px-3 py-2 text-left font-medium">Note</th>
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
                  <td className="px-3 py-2">{p.method}</td>
                  <td className="px-3 py-2">{p.receipt_no ?? "-"}</td>
                  <td className="px-3 py-2">{p.received_by_full_name}</td>
                  <td className="px-3 py-2">{p.note ?? "-"}</td>
                </tr>
              ))}

              {payments.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    No payments.
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
