-- =========================================
-- Add company users + pricing
-- =========================================

-- 1) Extend user_role enum
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'company';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Link users to companies (for company accounts)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id uuid NULL REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_company_role_company_id') THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_company_role_company_id
      CHECK (
        (role <> 'company')
        OR (company_id IS NOT NULL)
      );
  END IF;
END $$;

-- 3) Pricing settings (global default price for new documents)
CREATE TABLE IF NOT EXISTS pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_price_amount numeric(12,2) NOT NULL DEFAULT 0,
  default_price_currency text NOT NULL DEFAULT 'TRY',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_settings_updated_at') THEN
    CREATE TRIGGER trg_pricing_settings_updated_at
    BEFORE UPDATE ON pricing_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Ensure a single row exists (use the oldest as canonical)
INSERT INTO pricing_settings (default_price_amount, default_price_currency)
SELECT 0, 'TRY'
WHERE NOT EXISTS (SELECT 1 FROM pricing_settings);

-- 4) Company + template override prices (applies only when creating new docs)
CREATE TABLE IF NOT EXISTS company_template_prices (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES template_families(id) ON DELETE CASCADE,
  price_amount numeric(12,2) NOT NULL,
  price_currency text NOT NULL DEFAULT 'TRY',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_company_template_prices_company_id ON company_template_prices(company_id);
CREATE INDEX IF NOT EXISTS idx_company_template_prices_template_id ON company_template_prices(template_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_company_template_prices_updated_at') THEN
    CREATE TRIGGER trg_company_template_prices_updated_at
    BEFORE UPDATE ON company_template_prices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
