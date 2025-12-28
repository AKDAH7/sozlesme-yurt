-- =========================================
-- Notifications + Company reference code
-- =========================================

-- 1) Optional reference code for companies (used in document reference numbers)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS ref_code text NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_companies_ref_code_format') THEN
    ALTER TABLE companies
      ADD CONSTRAINT chk_companies_ref_code_format
      CHECK (ref_code IS NULL OR ref_code ~ '^[A-Z]{2,4}$');
  END IF;
END $$;

-- Unique when present
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_ref_code
  ON companies (ref_code)
  WHERE ref_code IS NOT NULL;


-- 2) Notifications
-- Targets are role-wide (admin) or company-wide (company + company_id).
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role user_role NOT NULL,
  company_id uuid NULL REFERENCES companies(id) ON DELETE CASCADE,

  title text NOT NULL,
  message text NULL,
  href text NULL,

  created_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  read_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_target_role_created_at
  ON notifications (target_role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_company_id_created_at
  ON notifications (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications (target_role, company_id)
  WHERE read_at IS NULL;
