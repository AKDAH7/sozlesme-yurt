-- =========================================
-- PostgreSQL DDL: Document Issuance + Verification + Accounting + Tracking
-- =========================================

-- Extensions
-- NOTE: citext must be created before using the citext type.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================================
-- Enums
-- =========================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','staff','accounting','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE doc_status AS ENUM ('active','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE requester_type AS ENUM ('company','direct');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('unpaid','partial','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash','bank_transfer','card','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tracking_status AS ENUM ('created','delivered_to_student','delivered_to_agent','shipped','received','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pdf_storage_type AS ENUM ('local','s3','db');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action_type AS ENUM ('create','update','status_change','payment_added','revoke','pdf_view','pdf_download','tracking_change');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================
-- Helper trigger function for updated_at
-- =========================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- Tables
-- =========================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL,
  email         citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          user_role NOT NULL DEFAULT 'staff',
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- COMPANIES
CREATE TABLE IF NOT EXISTS companies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  text NOT NULL,
  contact_name  text NULL,
  contact_phone text NULL,
  contact_email text NULL,
  notes         text NULL,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_company_name ON companies (company_name);

CREATE TRIGGER trg_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- verification identifiers
  token               text NOT NULL UNIQUE,          -- long random token for /verify/<token>
  barcode_id          text NOT NULL UNIQUE,          -- printed barcode id like GCGM03-...
  reference_no        text NOT NULL UNIQUE,          -- printed reference no

  -- creator
  created_by_user_id  uuid NOT NULL REFERENCES users(id),

  -- owner info
  owner_full_name     text NOT NULL,
  owner_identity_no   text NOT NULL,
  owner_birth_date    date NOT NULL,

  -- document info (HTML->PDF content fields)
  university_name     text NOT NULL,
  dorm_name           text NULL,
  dorm_address        text NULL,
  issue_date          date NOT NULL,
  footer_datetime     timestamptz NOT NULL,

  -- statuses
  doc_status          doc_status NOT NULL DEFAULT 'active',
  tracking_status     tracking_status NOT NULL DEFAULT 'created',

  -- requester (company or direct)
  requester_type        requester_type NOT NULL,
  company_id            uuid NULL REFERENCES companies(id),
  direct_customer_name  text NULL,
  direct_customer_phone text NULL,

  -- accounting
  price_amount        numeric(12,2) NOT NULL DEFAULT 0,
  price_currency      text NOT NULL DEFAULT 'TRY',
  payment_status      payment_status NOT NULL DEFAULT 'unpaid',

  -- pdf storage
  pdf_storage_type    pdf_storage_type NOT NULL DEFAULT 'local',
  pdf_url             text NULL,
  pdf_hash            text NULL,

  -- timestamps
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW(),

  -- constraints
  CONSTRAINT chk_documents_requester_company
    CHECK (
      (requester_type = 'company' AND company_id IS NOT NULL AND direct_customer_name IS NULL)
      OR
      (requester_type = 'direct' AND company_id IS NULL AND direct_customer_name IS NOT NULL)
    ),

  CONSTRAINT chk_documents_price_nonnegative
    CHECK (price_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_identity ON documents (owner_identity_no);
CREATE INDEX IF NOT EXISTS idx_documents_doc_status ON documents (doc_status);
CREATE INDEX IF NOT EXISTS idx_documents_tracking_status ON documents (tracking_status);
CREATE INDEX IF NOT EXISTS idx_documents_payment_status ON documents (payment_status);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents (company_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at);

CREATE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id        uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  received_amount    numeric(12,2) NOT NULL CHECK (received_amount > 0),
  currency           text NOT NULL DEFAULT 'TRY',
  method             payment_method NOT NULL,
  payment_date       timestamptz NOT NULL DEFAULT NOW(),

  received_by_user_id uuid NOT NULL REFERENCES users(id),

  receipt_no         text NULL,
  note               text NULL,

  created_at         timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_document_id ON payments (document_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments (payment_date);

-- TRACKING HISTORY
CREATE TABLE IF NOT EXISTS tracking_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  from_status       tracking_status NULL,
  to_status         tracking_status NOT NULL,
  changed_by_user_id uuid NOT NULL REFERENCES users(id),
  changed_at        timestamptz NOT NULL DEFAULT NOW(),
  note              text NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_history_document_id ON tracking_history (document_id);
CREATE INDEX IF NOT EXISTS idx_tracking_history_changed_at ON tracking_history (changed_at);

-- AUDIT LOGS (optional but recommended)
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       uuid NULL REFERENCES documents(id) ON DELETE SET NULL,
  action_type       audit_action_type NOT NULL,
  action_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  action_at         timestamptz NOT NULL DEFAULT NOW(),
  ip_address        inet NULL,
  user_agent        text NULL,
  details_json      jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_document_id ON document_audit_logs (document_id);
CREATE INDEX IF NOT EXISTS idx_audit_action_at ON document_audit_logs (action_at);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON document_audit_logs (action_type);

-- VERIFICATION ATTEMPTS (rate limit / security logging)
CREATE TABLE IF NOT EXISTS verification_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token          text NULL,
  reference_no   text NULL,
  identity_no_hash text NULL,
  birth_date     date NULL,
  success        boolean NOT NULL DEFAULT false,
  ip_address     inet NOT NULL,
  attempted_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verif_attempts_ip_time ON verification_attempts (ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_verif_attempts_token_time ON verification_attempts (token, attempted_at DESC);

-- =========================================
-- Optional: View to quickly compute paid / remaining (without storing totals)
-- =========================================

CREATE OR REPLACE VIEW v_documents_payment_summary AS
SELECT
  d.id AS document_id,
  d.reference_no,
  d.price_amount,
  d.price_currency,
  COALESCE(SUM(p.received_amount), 0) AS paid_amount,
  GREATEST(d.price_amount - COALESCE(SUM(p.received_amount), 0), 0) AS remaining_amount
FROM documents d
LEFT JOIN payments p ON p.document_id = d.id
GROUP BY d.id, d.reference_no, d.price_amount, d.price_currency;
