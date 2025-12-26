import { getPool } from "@/lib/db/pool";

export type UserRole = "admin" | "staff" | "accounting" | "viewer";

export type UserRow = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserMinimalRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getUserByIdMinimal(
  userId: string
): Promise<UserMinimalRow | null> {
  const pool = getPool();
  const result = await pool.query<UserMinimalRow>(
    `SELECT id,
            full_name,
            email::text as email,
            role,
            is_active,
            last_login_at::text as last_login_at,
            created_at::text as created_at,
            updated_at::text as updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function listUsers(): Promise<UserMinimalRow[]> {
  const pool = getPool();
  const result = await pool.query<UserMinimalRow>(
    `SELECT id,
            full_name,
            email::text as email,
            role,
            is_active,
            last_login_at::text as last_login_at,
            created_at::text as created_at,
            updated_at::text as updated_at
     FROM users
     ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function setUserActive(params: {
  userId: string;
  isActive: boolean;
}): Promise<Pick<UserMinimalRow, "id" | "is_active" | "updated_at">> {
  const pool = getPool();
  const result = await pool.query<{
    id: string;
    is_active: boolean;
    updated_at: string;
  }>(
    `UPDATE users
     SET is_active = $2
     WHERE id = $1
     RETURNING id, is_active, updated_at::text as updated_at`,
    [params.userId, params.isActive]
  );
  const row = result.rows[0];
  if (!row) throw Object.assign(new Error("Not found"), { status: 404 });
  return row;
}

export async function updateUserRole(params: {
  userId: string;
  role: UserRole;
}): Promise<Pick<UserMinimalRow, "id" | "role" | "updated_at">> {
  const pool = getPool();
  const result = await pool.query<{
    id: string;
    role: UserRole;
    updated_at: string;
  }>(
    `UPDATE users
     SET role = $2
     WHERE id = $1
     RETURNING id, role, updated_at::text as updated_at`,
    [params.userId, params.role]
  );
  const row = result.rows[0];
  if (!row) throw Object.assign(new Error("Not found"), { status: 404 });
  return row;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const pool = getPool();
  const result = await pool.query<UserRow>(
    `SELECT id, full_name, email::text as email, password_hash, role, is_active, last_login_at, created_at, updated_at
		 FROM users
		 WHERE email = $1
		 LIMIT 1`,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function touchUserLastLogin(userId: string): Promise<void> {
  const pool = getPool();
  await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [
    userId,
  ]);
}

export type CreateUserInput = {
  fullName: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
};

export type CreatedUser = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
};

export async function createUser(input: CreateUserInput): Promise<CreatedUser> {
  const pool = getPool();
  const role: UserRole = input.role ?? "staff";
  const result = await pool.query<CreatedUser>(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name, email::text as email, role`,
    [input.fullName, input.email, input.passwordHash, role]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Failed to create user");
  return row;
}

export async function countUsers(): Promise<number> {
  const pool = getPool();
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM users`
  );
  const raw = result.rows[0]?.count ?? "0";
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
