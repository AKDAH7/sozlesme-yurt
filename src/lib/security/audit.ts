import type { PoolClient } from "pg";

import type { AuditActionType } from "@/types/db";
import { getPool } from "@/lib/db/pool";

export async function insertDocumentAuditLog(
  input: {
    documentId: string | null;
    actionType: AuditActionType;
    actionByUserId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    detailsJson?: Record<string, unknown>;
  },
  client?: PoolClient
): Promise<void> {
  const runner = client ?? getPool();
  await runner.query(
    `INSERT INTO document_audit_logs (
			document_id,
			action_type,
			action_by_user_id,
			ip_address,
			user_agent,
			details_json
		)
		VALUES ($1, $2, $3, $4::inet, $5, $6::jsonb)`,
    [
      input.documentId,
      input.actionType,
      input.actionByUserId,
      input.ipAddress,
      input.userAgent,
      input.detailsJson ? JSON.stringify(input.detailsJson) : null,
    ]
  );
}
