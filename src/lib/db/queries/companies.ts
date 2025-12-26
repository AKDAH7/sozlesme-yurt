import { getPool } from "@/lib/db/pool";

export type CompanyRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function companyExists(companyId: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query<{ ok: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM companies WHERE id = $1) as ok`,
    [companyId]
  );
  return result.rows[0]?.ok ?? false;
}

export async function listCompaniesMinimal(): Promise<
  Array<{ id: string; company_name: string }>
> {
  const pool = getPool();
  const result = await pool.query<{ id: string; company_name: string }>(
    `SELECT id, company_name
		 FROM companies
		 ORDER BY company_name ASC`
  );
  return result.rows;
}

export async function listCompanies(): Promise<CompanyRow[]> {
  const pool = getPool();
  const result = await pool.query<CompanyRow>(
    `SELECT
      id,
      company_name,
      contact_name,
      contact_phone,
      contact_email,
      notes,
      created_at::text as created_at,
      updated_at::text as updated_at
     FROM companies
     ORDER BY company_name ASC`
  );
  return result.rows;
}

export async function getCompanyById(id: string): Promise<CompanyRow | null> {
  const pool = getPool();
  const result = await pool.query<CompanyRow>(
    `SELECT
      id,
      company_name,
      contact_name,
      contact_phone,
      contact_email,
      notes,
      created_at::text as created_at,
      updated_at::text as updated_at
     FROM companies
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export type CreateCompanyInput = {
  companyName: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
};

export async function createCompany(
  input: CreateCompanyInput
): Promise<{ id: string }> {
  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    `INSERT INTO companies (company_name, contact_name, contact_phone, contact_email, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      input.companyName,
      input.contactName,
      input.contactPhone,
      input.contactEmail,
      input.notes,
    ]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Failed to create company");
  return row;
}

export type UpdateCompanyInput = {
  companyName: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
};

export async function updateCompany(params: {
  id: string;
  input: UpdateCompanyInput;
}): Promise<{ id: string; updated_at: string }> {
  const pool = getPool();
  const result = await pool.query<{ id: string; updated_at: string }>(
    `UPDATE companies
     SET company_name = $2,
         contact_name = $3,
         contact_phone = $4,
         contact_email = $5,
         notes = $6
     WHERE id = $1
     RETURNING id, updated_at::text as updated_at`,
    [
      params.id,
      params.input.companyName,
      params.input.contactName,
      params.input.contactPhone,
      params.input.contactEmail,
      params.input.notes,
    ]
  );
  const row = result.rows[0];
  if (!row) throw Object.assign(new Error("Not found"), { status: 404 });
  return row;
}
