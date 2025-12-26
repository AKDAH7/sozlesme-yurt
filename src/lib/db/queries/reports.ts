import { getPool } from "@/lib/db/pool";
import type { PaymentMethod, PaymentStatus } from "@/types/db";

export type ReportsSummary = {
  total_documents: number;
  total_sales: string;
  total_collected: string;
  remaining: string;
  payment_status_counts: Record<PaymentStatus, number>;
};

export type PaymentsByMethodRow = {
  method: PaymentMethod;
  total_received: string;
};

export type TopCompanyRow = {
  company_id: string;
  company_name: string;
  documents_count: number;
  total_sales: string;
};

function coerceDateParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export function parseReportRange(params: {
  from: string | null;
  to: string | null;
}): { from: string | null; to: string | null } {
  const from = coerceDateParam(params.from);
  const to = coerceDateParam(params.to);
  return { from, to };
}

export async function getReportsSummary(params: {
  from: string | null;
  to: string | null;
}): Promise<ReportsSummary> {
  const pool = getPool();
  const result = await pool.query<{
    total_documents: string;
    total_sales: string;
    total_collected: string;
    remaining: string;
    unpaid_count: string;
    partial_count: string;
    paid_count: string;
  }>(
    `WITH docs AS (
			SELECT d.id, d.price_amount, d.payment_status
			FROM documents d
			WHERE ($1::date IS NULL OR d.issue_date >= $1::date)
				AND ($2::date IS NULL OR d.issue_date <= $2::date)
		),
		pay AS (
			SELECT COALESCE(SUM(p.received_amount), 0) AS collected
			FROM payments p
			JOIN docs ON docs.id = p.document_id
		)
		SELECT
			COUNT(*)::text AS total_documents,
			COALESCE(SUM(docs.price_amount), 0)::text AS total_sales,
			(SELECT collected::text FROM pay) AS total_collected,
			(COALESCE(SUM(docs.price_amount), 0) - (SELECT collected FROM pay))::text AS remaining,
			COALESCE(SUM(CASE WHEN docs.payment_status = 'unpaid' THEN 1 ELSE 0 END), 0)::text AS unpaid_count,
			COALESCE(SUM(CASE WHEN docs.payment_status = 'partial' THEN 1 ELSE 0 END), 0)::text AS partial_count,
			COALESCE(SUM(CASE WHEN docs.payment_status = 'paid' THEN 1 ELSE 0 END), 0)::text AS paid_count
		FROM docs`,
    [params.from, params.to]
  );

  const row = result.rows[0];
  return {
    total_documents: Number(row?.total_documents ?? "0"),
    total_sales: row?.total_sales ?? "0",
    total_collected: row?.total_collected ?? "0",
    remaining: row?.remaining ?? "0",
    payment_status_counts: {
      unpaid: Number(row?.unpaid_count ?? "0"),
      partial: Number(row?.partial_count ?? "0"),
      paid: Number(row?.paid_count ?? "0"),
    },
  };
}

export async function getPaymentsByMethod(params: {
  from: string | null;
  to: string | null;
}): Promise<PaymentsByMethodRow[]> {
  const pool = getPool();
  const result = await pool.query<PaymentsByMethodRow>(
    `WITH docs AS (
			SELECT d.id
			FROM documents d
			WHERE ($1::date IS NULL OR d.issue_date >= $1::date)
				AND ($2::date IS NULL OR d.issue_date <= $2::date)
		)
		SELECT
			p.method,
			COALESCE(SUM(p.received_amount), 0)::text AS total_received
		FROM payments p
		JOIN docs ON docs.id = p.document_id
		GROUP BY p.method
		ORDER BY p.method ASC`,
    [params.from, params.to]
  );

  const all: PaymentMethod[] = ["cash", "bank_transfer", "card", "other"];
  const map = new Map(result.rows.map((r) => [r.method, r] as const));
  return all.map(
    (method) => map.get(method) ?? { method, total_received: "0" }
  );
}

export async function getTopRequestingCompanies(params: {
  from: string | null;
  to: string | null;
  limit: number;
}): Promise<TopCompanyRow[]> {
  const pool = getPool();
  const limit = Number.isFinite(params.limit)
    ? Math.max(1, Math.min(50, Math.floor(params.limit)))
    : 10;

  const result = await pool.query<TopCompanyRow>(
    `SELECT
			c.id as company_id,
			c.company_name,
			COUNT(d.id)::int as documents_count,
			COALESCE(SUM(d.price_amount), 0)::text as total_sales
		FROM documents d
		JOIN companies c ON c.id = d.company_id
		WHERE d.requester_type = 'company'
			AND ($1::date IS NULL OR d.issue_date >= $1::date)
			AND ($2::date IS NULL OR d.issue_date <= $2::date)
		GROUP BY c.id, c.company_name
		ORDER BY COUNT(d.id) DESC
		LIMIT $3`,
    [params.from, params.to, limit]
  );
  return result.rows;
}
