import { getPool } from "@/lib/db/pool";

export type PricingSettingsRow = {
  id: string;
  default_price_amount: string;
  default_price_currency: string;
  updated_at: string;
};

export type Money = { amount: number; currency: string };

export async function getPricingSettings(): Promise<PricingSettingsRow> {
  const pool = getPool();
  const result = await pool.query<PricingSettingsRow>(
    `SELECT id,
            default_price_amount::text as default_price_amount,
            default_price_currency,
            updated_at::text as updated_at
     FROM pricing_settings
     ORDER BY created_at ASC
     LIMIT 1`
  );

  const row = result.rows[0];
  if (!row) {
    // Defensive: migration should have inserted a row.
    throw new Error("pricing_settings row is missing");
  }
  return row;
}

export async function updatePricingSettings(params: {
  defaultPriceAmount: number;
  defaultPriceCurrency: string;
}): Promise<
  Pick<
    PricingSettingsRow,
    "id" | "default_price_amount" | "default_price_currency" | "updated_at"
  >
> {
  const pool = getPool();
  const settings = await getPricingSettings();

  const amount = Number.isFinite(params.defaultPriceAmount)
    ? Math.max(0, params.defaultPriceAmount)
    : 0;
  const currency = params.defaultPriceCurrency.trim() || "TRY";

  const result = await pool.query<{
    id: string;
    default_price_amount: string;
    default_price_currency: string;
    updated_at: string;
  }>(
    `UPDATE pricing_settings
     SET default_price_amount = $2,
         default_price_currency = $3
     WHERE id = $1
     RETURNING id,
               default_price_amount::text as default_price_amount,
               default_price_currency,
               updated_at::text as updated_at`,
    [settings.id, amount, currency]
  );

  const row = result.rows[0];
  if (!row) throw new Error("Failed to update pricing settings");
  return row;
}

export type CompanyTemplatePriceRow = {
  company_id: string;
  template_id: string;
  template_name: string;
  price_amount: string;
  price_currency: string;
  updated_at: string;
};

export async function listCompanyTemplatePrices(params: {
  companyId: string;
}): Promise<CompanyTemplatePriceRow[]> {
  const pool = getPool();
  const result = await pool.query<CompanyTemplatePriceRow>(
    `SELECT
      ctp.company_id,
      ctp.template_id,
      tf.name as template_name,
      ctp.price_amount::text as price_amount,
      ctp.price_currency,
      ctp.updated_at::text as updated_at
     FROM company_template_prices ctp
     JOIN template_families tf ON tf.id = ctp.template_id
     WHERE ctp.company_id = $1
     ORDER BY tf.name ASC`,
    [params.companyId]
  );
  return result.rows;
}

export async function upsertCompanyTemplatePrice(params: {
  companyId: string;
  templateId: string;
  priceAmount: number;
  priceCurrency: string;
}): Promise<{
  company_id: string;
  template_id: string;
  price_amount: string;
  price_currency: string;
  updated_at: string;
}> {
  const pool = getPool();
  const amount = Number.isFinite(params.priceAmount)
    ? Math.max(0, params.priceAmount)
    : 0;
  const currency = params.priceCurrency.trim() || "TRY";

  const result = await pool.query<{
    company_id: string;
    template_id: string;
    price_amount: string;
    price_currency: string;
    updated_at: string;
  }>(
    `INSERT INTO company_template_prices (company_id, template_id, price_amount, price_currency)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (company_id, template_id)
     DO UPDATE SET price_amount = EXCLUDED.price_amount,
                   price_currency = EXCLUDED.price_currency
     RETURNING company_id, template_id,
               price_amount::text as price_amount,
               price_currency,
               updated_at::text as updated_at`,
    [params.companyId, params.templateId, amount, currency]
  );

  const row = result.rows[0];
  if (!row) throw new Error("Failed to upsert company template price");
  return row;
}

export async function deleteCompanyTemplatePrice(params: {
  companyId: string;
  templateId: string;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `DELETE FROM company_template_prices
     WHERE company_id = $1 AND template_id = $2`,
    [params.companyId, params.templateId]
  );
}

export async function getEffectivePrice(params: {
  companyId: string;
  templateId: string | null;
}): Promise<Money> {
  const pool = getPool();

  if (params.templateId) {
    const override = await pool.query<{
      price_amount: string;
      price_currency: string;
    }>(
      `SELECT price_amount::text as price_amount, price_currency
       FROM company_template_prices
       WHERE company_id = $1 AND template_id = $2
       LIMIT 1`,
      [params.companyId, params.templateId]
    );

    const row = override.rows[0];
    if (row) {
      const amount = Number(row.price_amount);
      return {
        amount: Number.isFinite(amount) ? amount : 0,
        currency: row.price_currency || "TRY",
      };
    }
  }

  const settings = await getPricingSettings();
  const amount = Number(settings.default_price_amount);
  return {
    amount: Number.isFinite(amount) ? amount : 0,
    currency: settings.default_price_currency || "TRY",
  };
}
