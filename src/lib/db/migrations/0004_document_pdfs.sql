-- =========================================
-- Store generated PDFs in Postgres (for serverless deployments)
-- =========================================

CREATE TABLE IF NOT EXISTS document_pdfs (
  document_id uuid PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  pdf_bytes   bytea NOT NULL,
  pdf_hash    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_document_pdfs_updated_at') THEN
    CREATE TRIGGER trg_document_pdfs_updated_at
    BEFORE UPDATE ON document_pdfs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
