import { getPool } from "@/lib/db/pool";

export type SessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
};

export async function insertSession(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.userId,
      input.tokenHash,
      input.expiresAt,
      input.ipAddress,
      input.userAgent,
    ]
  );
}

export async function revokeSessionByHash(tokenHash: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE sessions SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
}

export async function getActiveSessionByHash(
  tokenHash: string
): Promise<SessionRow | null> {
  const pool = getPool();
  const result = await pool.query<SessionRow>(
    `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, ip_address, user_agent
     FROM sessions
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}
