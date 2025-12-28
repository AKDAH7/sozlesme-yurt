import { getPool } from "@/lib/db/pool";

export type CompanyRow = {
  id: string;
  company_name: string;
  ref_code: string | null;
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
      ref_code,
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
      ref_code,
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
  refCode: string | null;
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
    `INSERT INTO companies (company_name, ref_code, contact_name, contact_phone, contact_email, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.companyName,
      input.refCode,
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

export type CreateCompanyWithAccountInput = CreateCompanyInput & {
  accountFullName: string;
  accountEmail: string;
  accountPasswordHash: string;
};

export async function createCompanyWithAccount(
  input: CreateCompanyWithAccountInput
): Promise<{ companyId: string; userId: string }> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const companyRes = await client.query<{ id: string }>(
      `INSERT INTO companies (company_name, ref_code, contact_name, contact_phone, contact_email, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        input.companyName,
        input.refCode,
        input.contactName,
        input.contactPhone,
        input.contactEmail,
        input.notes,
      ]
    );
    const companyRow = companyRes.rows[0];
    if (!companyRow) throw new Error("Failed to create company");

    const userRes = await client.query<{ id: string }>(
      `INSERT INTO users (full_name, email, password_hash, role, company_id)
       VALUES ($1, $2, $3, 'company', $4)
       RETURNING id`,
      [
        input.accountFullName,
        input.accountEmail,
        input.accountPasswordHash,
        companyRow.id,
      ]
    );
    const userRow = userRes.rows[0];
    if (!userRow) throw new Error("Failed to create company account");

    await client.query("COMMIT");
    return { companyId: companyRow.id, userId: userRow.id };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    throw err;
  } finally {
    client.release();
  }
}

export type UpdateCompanyInput = {
  companyName: string;
  refCode: string | null;
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
         ref_code = $3,
         contact_name = $4,
         contact_phone = $5,
         contact_email = $6,
         notes = $7
     WHERE id = $1
     RETURNING id, updated_at::text as updated_at`,
    [
      params.id,
      params.input.companyName,
      params.input.refCode,
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

export async function getCompanyRefCodeById(
  companyId: string
): Promise<string | null> {
  const pool = getPool();
  const result = await pool.query<{ ref_code: string | null }>(
    `SELECT ref_code
     FROM companies
     WHERE id = $1
     LIMIT 1`,
    [companyId]
  );
  return result.rows[0]?.ref_code ?? null;
}
