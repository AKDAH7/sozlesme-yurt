import { getPool } from "@/lib/db/pool";

export type AccountingSelectionSummary = {
  currency: string;
  total_documents: number;
  total_sales: string;
  total_collected: string;
  remaining: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function getAccountingSummaryForDocuments(params: {
  documentIds: string[];
}): Promise<AccountingSelectionSummary> {
  const ids = Array.isArray(params.documentIds)
    ? params.documentIds.filter((v) => typeof v === "string" && isUuid(v))
    : [];

  if (ids.length === 0) {
    return {
      currency: "TRY",
      total_documents: 0,
      total_sales: "0",
      total_collected: "0",
      remaining: "0",
    };
  }

  const pool = getPool();

  // Enforce a single document currency for now.
  const currencyRes = await pool.query<{ price_currency: string }>(
    `WITH docs AS (
      SELECT price_currency
      FROM documents
      WHERE id = ANY($1::uuid[])
    )
    SELECT price_currency
    FROM docs
    GROUP BY price_currency
    ORDER BY price_currency ASC`,
    [ids]
  );

  const currencies = currencyRes.rows.map((r) => r.price_currency);
  if (currencies.length > 1) {
    throw Object.assign(new Error("Multiple currencies are not supported"), {
      status: 400,
    });
  }

  const currency = currencies[0] ?? "TRY";

  const result = await pool.query<{
    total_documents: string;
    total_sales: string;
    total_collected: string;
    remaining: string;
  }>(
    `WITH docs AS (
      SELECT d.id, d.price_amount
      FROM documents d
      WHERE d.id = ANY($1::uuid[])
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
      (COALESCE(SUM(docs.price_amount), 0) - (SELECT collected FROM pay))::text AS remaining
    FROM docs`,
    [ids]
  );

  const row = result.rows[0];
  return {
    currency,
    total_documents: Number(row?.total_documents ?? "0"),
    total_sales: row?.total_sales ?? "0",
    total_collected: row?.total_collected ?? "0",
    remaining: row?.remaining ?? "0",
  };
}
