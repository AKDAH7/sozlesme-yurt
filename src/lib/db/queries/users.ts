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
