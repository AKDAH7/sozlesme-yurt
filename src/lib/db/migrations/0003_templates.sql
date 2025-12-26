-- =========================================
-- PostgreSQL DDL: Templates (versioned) + link to documents
-- =========================================

-- TEMPLATE FAMILIES (stable identity)
CREATE TABLE IF NOT EXISTS template_families (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  description       text NULL,
  language          text NOT NULL DEFAULT 'multi',
  is_active         boolean NOT NULL DEFAULT true,
  created_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_template_families_language
    CHECK (language IN ('tr','en','ar','multi'))
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_template_families_updated_at') THEN
    CREATE TRIGGER trg_template_families_updated_at
    BEFORE UPDATE ON template_families
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- TEMPLATE VERSIONS (immutable content)
CREATE TABLE IF NOT EXISTS template_versions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       uuid NOT NULL REFERENCES template_families(id) ON DELETE RESTRICT,
  version           int NOT NULL,
  html_content      text NOT NULL,
  variables_definition jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_template_versions_version_pos CHECK (version >= 1),
  CONSTRAINT uq_template_versions_template_version UNIQUE (template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions (template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id_version_desc ON template_versions (template_id, version DESC);

-- Link documents to templates (optional for backward compatibility)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS template_id uuid NULL REFERENCES template_families(id);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS template_version int NULL;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS template_values jsonb NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_documents_template_fields'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT chk_documents_template_fields
      CHECK (
        (template_id IS NULL AND template_version IS NULL AND template_values IS NULL)
        OR
        (template_id IS NOT NULL AND template_version IS NOT NULL AND template_values IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_template_id ON documents (template_id);

-- =========================================
-- Seed: Default Template (idempotent)
-- =========================================

DO $$
DECLARE
  v_template_id uuid;
BEGIN
  SELECT id INTO v_template_id
  FROM template_families
  WHERE name = 'Default Template'
  LIMIT 1;

  IF v_template_id IS NULL THEN
    INSERT INTO template_families (
      name,
      description,
      language,
      is_active,
      created_by_user_id
    ) VALUES (
      'Default Template',
      'Built-in starter template (A4 HTML + placeholders).',
      'multi',
      true,
      NULL
    )
    RETURNING id INTO v_template_id;

    INSERT INTO template_versions (
      template_id,
      version,
      html_content,
      variables_definition,
      created_by_user_id
    ) VALUES (
      v_template_id,
      1,
      $$
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{reference_no}}</title>
    <style>
      @page { size: A4; margin: 20mm; }
      html, body { padding: 0; margin: 0; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #111; }
      * { box-sizing: border-box; }

      .page { position: relative; width: 210mm; min-height: 297mm; }

      .header { padding-bottom: 8mm; border-bottom: 1px solid #ddd; }
      .header-title { font-size: 14pt; font-weight: 700; letter-spacing: 0.2px; }
      .header-sub { margin-top: 2mm; font-size: 10pt; color: #444; }

      .stamp { position: absolute; top: 0; right: 0; width: 26mm; height: 26mm; }
      .stamp img { width: 100%; height: 100%; object-fit: contain; }

      .body { padding-top: 8mm; padding-bottom: 32mm; }
      .lead { margin: 0 0 6mm 0; line-height: 1.5; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 10mm; }
      .field { display: grid; gap: 1mm; }
      .label { font-size: 9pt; color: #555; }
      .value { font-size: 11pt; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 10pt; }

      .footer { position: absolute; left: 0; right: 0; bottom: 0; padding-top: 5mm; border-top: 1px solid #ddd; }
      .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; align-items: end; }

      .verify { font-size: 9pt; color: #444; }
      .verify a { color: #111; text-decoration: none; }

      .qr { display: grid; justify-items: end; gap: 2mm; }
      .qr img { width: 28mm; height: 28mm; }

      .barcode { display: grid; justify-items: start; gap: 2mm; }
      .barcode img { height: 14mm; width: auto; }

      .small { font-size: 9pt; color: #444; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="stamp">
        <img src="{{stamp_data_url}}" alt="stamp" />
      </div>

      <header class="header">
        <div class="header-title">University Dormitory Letter</div>
        <div class="header-sub">
          Reference: <span class="mono">{{reference_no}}</span>
        </div>
      </header>

      <main class="body">
        <p class="lead">
          This letter is issued by <strong>{{university_name}}</strong> confirming the information below.
        </p>

        <div class="grid">
          <div class="field"><div class="label">Owner full name</div><div class="value">{{owner_full_name}}</div></div>
          <div class="field"><div class="label">Owner ID number</div><div class="value mono">{{owner_identity_no}}</div></div>
          <div class="field"><div class="label">Birth date</div><div class="value">{{owner_birth_date}}</div></div>
          <div class="field"><div class="label">University</div><div class="value">{{university_name}}</div></div>
          <div class="field"><div class="label">Dormitory name</div><div class="value">{{dorm_name}}</div></div>
          <div class="field"><div class="label">Dormitory address</div><div class="value">{{dorm_address}}</div></div>
          <div class="field"><div class="label">Issue date</div><div class="value">{{issue_date}}</div></div>
          <div class="field"><div class="label">Footer datetime</div><div class="value">{{footer_datetime}}</div></div>
          <div class="field"><div class="label">Requester</div><div class="value">{{requester_label}}</div></div>
          <div class="field"><div class="label">Price</div><div class="value">{{price_label}}</div></div>
          <div class="field"><div class="label">Barcode</div><div class="value mono">{{barcode_id}}</div></div>
          <div class="field"><div class="label">Verification</div><div class="value mono">{{verification_path}}</div></div>
        </div>
      </main>

      <footer class="footer">
        <div class="footer-grid">
          <div class="barcode">
            <div class="small">Barcode</div>
            <img src="{{barcode_data_url}}" alt="barcode" />
            <div class="mono">{{barcode_id}}</div>
            <div class="small">Ref: <span class="mono">{{reference_no}}</span></div>
            <div class="verify">Verify: <a href="{{verification_url}}">{{verification_url}}</a></div>
          </div>
          <div class="qr">
            <div class="small">QR</div>
            <img src="{{qr_data_url}}" alt="qr" />
          </div>
        </div>
      </footer>
    </div>
  </body>
</html>
      $$,
      '[
        {"key":"owner_full_name","label":"Full name","type":"text","required":true},
        {"key":"owner_identity_no","label":"ID number","type":"text","required":true},
        {"key":"owner_birth_date","label":"Birth date","type":"date","required":true},
        {"key":"university_name","label":"University","type":"text","required":true},
        {"key":"dorm_name","label":"Dormitory name","type":"text","required":false},
        {"key":"dorm_address","label":"Dormitory address","type":"text","required":false},
        {"key":"issue_date","label":"Issue date","type":"date","required":true},
        {"key":"footer_datetime","label":"Footer datetime","type":"text","required":true},
        {"key":"requester_type","label":"Requester type","type":"text","required":true},
        {"key":"company_id","label":"Company ID","type":"text","required":true},
        {"key":"direct_customer_name","label":"Customer name","type":"text","required":true},
        {"key":"direct_customer_phone","label":"Customer phone","type":"text","required":false},
        {"key":"price_amount","label":"Amount","type":"number","required":true},
        {"key":"price_currency","label":"Currency","type":"text","required":true}
      ]'::jsonb,
      NULL
    );
  END IF;
END $$;
