"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { CheckCircle2, Circle } from "lucide-react";

import type { DocStatus, TrackingStatus } from "@/types/db";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  doc_status: DocStatus;
  tracking_status: TrackingStatus;
  payment_status: "unpaid" | "partial" | "paid";
  price_amount: string;
  price_currency: string;
  owner_full_name: string;
  owner_identity_no: string;
  reference_no: string;
  company_name: string | null;
  direct_customer_name: string | null;
  created_at: string;
  pdf_url: string | null;
  pdf_hash: string | null;
};

function StatusPillButton(props: {
  value: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs",
        "bg-muted text-foreground",
        props.disabled ? "opacity-60" : "hover:bg-muted/80"
      )}
    >
      {props.value}
    </button>
  );
}

const DOC_STATUS_OPTIONS: DocStatus[] = ["active", "inactive"];
const TRACKING_STATUS_OPTIONS: TrackingStatus[] = [
  "created",
  "residence_file_delivered",
  "residence_file_received",
  "shipped",
  "received",
  "delivered_to_student",
  "delivered_to_agent",
  "cancelled",
];

export function DocumentsTableClient(props: { rows: Row[] }) {
  const t = useTranslations("documents.list");
  const tStatus = useTranslations("status");
  const router = useRouter();

  const [editing, setEditing] = React.useState<{
    id: string;
    field: "doc" | "tracking";
  } | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  async function updateDocStatus(id: string, next: DocStatus) {
    setSavingId(id);
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ doc_status: next }),
        }
      );
      if (!res.ok) throw new Error("update_failed");
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function updateTrackingStatus(id: string, next: TrackingStatus) {
    setSavingId(id);
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(id)}/tracking`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ to_status: next }),
        }
      );
      if (!res.ok) throw new Error("update_failed");
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-start font-medium">
              {t("table.pdf")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("table.fileOwner")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("table.idNumber")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("table.reference")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("table.fileStatus")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("table.tracking")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("table.price")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("table.payment")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("table.companyCustomer")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("table.created")}
            </th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((r) => {
            const isSaving = savingId === r.id;

            return (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  {r.pdf_url && r.pdf_hash ? (
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </td>

                <td className="px-3 py-2">
                  <Link className="hover:underline" href={`/documents/${r.id}`}>
                    {r.owner_full_name}
                  </Link>
                </td>

                <td className="px-3 py-2 font-mono text-xs">
                  {r.owner_identity_no}
                </td>

                <td className="px-3 py-2 font-mono text-xs">
                  {r.reference_no}
                </td>

                <td className="px-3 py-2">
                  {editing?.id === r.id && editing.field === "doc" ? (
                    <select
                      className={cn(
                        "flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground [&>option]:bg-background [&>option]:text-foreground",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      )}
                      defaultValue={r.doc_status}
                      onBlur={() => setEditing(null)}
                      onChange={(e) => {
                        const next = e.target.value as DocStatus;
                        setEditing(null);
                        void updateDocStatus(r.id, next);
                      }}
                      disabled={isSaving}
                      autoFocus
                    >
                      {DOC_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {tStatus(`document.${s}`)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StatusPillButton
                      value={tStatus(`document.${r.doc_status}`)}
                      disabled={isSaving}
                      onClick={() => setEditing({ id: r.id, field: "doc" })}
                    />
                  )}
                </td>

                <td className="px-3 py-2">
                  {editing?.id === r.id && editing.field === "tracking" ? (
                    <select
                      className={cn(
                        "flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground [&>option]:bg-background [&>option]:text-foreground",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      )}
                      defaultValue={r.tracking_status}
                      onBlur={() => setEditing(null)}
                      onChange={(e) => {
                        const next = e.target.value as TrackingStatus;
                        setEditing(null);
                        void updateTrackingStatus(r.id, next);
                      }}
                      disabled={isSaving}
                      autoFocus
                    >
                      {TRACKING_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {tStatus(`tracking.${s}`)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StatusPillButton
                      value={tStatus(`tracking.${r.tracking_status}`)}
                      disabled={isSaving}
                      onClick={() =>
                        setEditing({ id: r.id, field: "tracking" })
                      }
                    />
                  )}
                </td>

                <td className="px-3 py-2">
                  {r.price_amount} {r.price_currency}
                </td>

                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs",
                      "bg-muted text-foreground"
                    )}
                  >
                    {tStatus(`payment.${r.payment_status}`)}
                  </span>
                </td>

                <td className="px-3 py-2">
                  {r.company_name ?? r.direct_customer_name ?? "-"}
                </td>

                <td className="px-3 py-2">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            );
          })}

          {props.rows.length === 0 ? (
            <tr>
              <td
                className="px-3 py-6 text-center text-muted-foreground"
                colSpan={10}
              >
                {t("table.empty")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
