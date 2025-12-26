import { getPool } from "@/lib/db/pool";

export async function upsertDocumentPdf(params: {
  documentId: string;
  pdfBytes: Buffer;
  pdfHash: string;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO document_pdfs (document_id, pdf_bytes, pdf_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (document_id)
     DO UPDATE SET pdf_bytes = EXCLUDED.pdf_bytes, pdf_hash = EXCLUDED.pdf_hash, updated_at = NOW()`,
    [params.documentId, params.pdfBytes, params.pdfHash]
  );
}

export async function getDocumentPdfBytes(params: {
  documentId: string;
}): Promise<{ pdfBytes: Buffer; pdfHash: string } | null> {
  const pool = getPool();
  const result = await pool.query<{ pdf_bytes: Buffer; pdf_hash: string }>(
    `SELECT pdf_bytes, pdf_hash
     FROM document_pdfs
     WHERE document_id = $1
     LIMIT 1`,
    [params.documentId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { pdfBytes: row.pdf_bytes, pdfHash: row.pdf_hash };
}
