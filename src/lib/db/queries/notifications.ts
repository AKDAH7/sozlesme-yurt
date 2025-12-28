import type { UserRole } from "@/types/db";
import { getPool } from "@/lib/db/pool";

export type NotificationRow = {
  id: string;
  target_role: UserRole;
  company_id: string | null;
  title: string;
  message: string | null;
  href: string | null;
  created_by_user_id: string | null;
  created_at: string;
  read_at: string | null;
};

export async function createNotification(params: {
  targetRole: UserRole;
  companyId?: string | null;
  title: string;
  message?: string | null;
  href?: string | null;
  createdByUserId?: string | null;
}): Promise<{ id: string }> {
  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    `INSERT INTO notifications (
      target_role,
      company_id,
      title,
      message,
      href,
      created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id`,
    [
      params.targetRole,
      params.companyId ?? null,
      params.title,
      params.message ?? null,
      params.href ?? null,
      params.createdByUserId ?? null,
    ]
  );

  const row = result.rows[0];
  if (!row) throw new Error("Failed to create notification");
  return row;
}

export async function listNotificationsForViewer(params: {
  role: UserRole;
  companyId?: string | null;
  limit?: number;
}): Promise<{ notifications: NotificationRow[]; unreadCount: number }> {
  const pool = getPool();
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);

  const companyId = params.role === "company" ? params.companyId ?? null : null;

  const notificationsRes = await pool.query<NotificationRow>(
    `SELECT
      id,
      target_role,
      company_id,
      title,
      message,
      href,
      created_by_user_id,
      created_at::text as created_at,
      read_at::text as read_at
     FROM notifications
     WHERE target_role = $1
       AND (CASE WHEN $1 = 'company' THEN company_id = $2 ELSE company_id IS NULL END)
     ORDER BY created_at DESC
     LIMIT $3`,
    [params.role, companyId, limit]
  );

  const unreadRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text as count
     FROM notifications
     WHERE target_role = $1
       AND (CASE WHEN $1 = 'company' THEN company_id = $2 ELSE company_id IS NULL END)
       AND read_at IS NULL`,
    [params.role, companyId]
  );

  return {
    notifications: notificationsRes.rows,
    unreadCount: Number(unreadRes.rows[0]?.count ?? "0"),
  };
}

export async function markNotificationRead(params: {
  id: string;
  role: UserRole;
  companyId?: string | null;
}): Promise<{ id: string; read_at: string }> {
  const pool = getPool();

  const companyId = params.role === "company" ? params.companyId ?? null : null;

  const result = await pool.query<{ id: string; read_at: string }>(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, NOW())
     WHERE id = $1
       AND target_role = $2
       AND (CASE WHEN $2 = 'company' THEN company_id = $3 ELSE company_id IS NULL END)
     RETURNING id, read_at::text as read_at`,
    [params.id, params.role, companyId]
  );

  const row = result.rows[0];
  if (!row) throw Object.assign(new Error("Not found"), { status: 404 });
  return row;
}
