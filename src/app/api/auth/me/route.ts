import {
  readSessionTokenFromCookies,
  hashSessionToken,
} from "@/lib/auth/session";
import { getActiveSessionByHash } from "@/lib/db/queries/sessions";
import { getPool } from "@/lib/db/pool";

export async function GET() {
  const token = await readSessionTokenFromCookies();
  if (!token) {
    return Response.json({ ok: true, user: null });
  }

  const session = await getActiveSessionByHash(hashSessionToken(token));
  if (!session) {
    return Response.json({ ok: true, user: null });
  }

  const pool = getPool();
  const result = await pool.query<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    company_id: string | null;
    is_active: boolean;
  }>(
    `SELECT id, full_name, email::text as email, role, company_id, is_active
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [session.user_id]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) {
    return Response.json({ ok: true, user: null });
  }

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    },
  });
}
