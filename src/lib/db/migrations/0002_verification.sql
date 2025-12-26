-- VERIFY FLOW SUPPORT

-- Note: `verification_attempts` already exists in 0001_document_issuance.sql.
-- This migration only adds short-lived verify sessions.

CREATE TABLE IF NOT EXISTS verify_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   text NOT NULL UNIQUE,
  document_id  uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ip_address   inet NULL,
  user_agent   text NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verify_sessions_doc_expires
  ON verify_sessions (document_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_verify_sessions_expires
  ON verify_sessions (expires_at DESC);
