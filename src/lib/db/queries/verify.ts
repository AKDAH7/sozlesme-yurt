import crypto from "crypto";

import { getPool } from "@/lib/db/pool";

export type VerifyMatchRow = {
  id: string;
  doc_status: "active" | "inactive";
  barcode_id: string;
  reference_no: string;
  owner_full_name: string;
  university_name: string;
  pdf_url: string | null;
  pdf_hash: string | null;
};

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function hashIdentityNo(identityNo: string): string {
  return sha256Hex(identityNo);
}

export async function insertVerificationAttempt(params: {
  ipAddress: string;
  success: boolean;
  token: string | null;
  referenceNo: string | null;
  identityNoHash: string | null;
  birthDate: string | null; // YYYY-MM-DD (optional; kept for history)
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO verification_attempts (
      token,
      reference_no,
      identity_no_hash,
      birth_date,
      success,
      ip_address
    ) VALUES ($1, $2, $3, $4::date, $5, $6::inet)`,
    [
      params.token,
      params.referenceNo,
      params.identityNoHash,
      params.birthDate,
      params.success,
      params.ipAddress,
    ]
  );
}

export async function countRecentFailedAttemptsByIp(params: {
  ipAddress: string;
  windowMinutes: number;
}): Promise<number> {
  const pool = getPool();
  const windowMinutes = Math.max(1, Math.floor(params.windowMinutes));
  const result = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text as total
     FROM verification_attempts
     WHERE ip_address = $1::inet
       AND success = false
       AND attempted_at > NOW() - ($2 || ' minutes')::interval`,
    [params.ipAddress, String(windowMinutes)]
  );
  return Number(result.rows[0]?.total ?? "0");
}

function generateVerifySessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashVerifySessionToken(token: string): string {
  return sha256Hex(token);
}

export async function createVerifySession(params: {
  documentId: string;
  ipAddress: string | null;
  userAgent: string | null;
  ttlMinutes: number;
}): Promise<{ token: string; expiresAt: string }> {
  const pool = getPool();
  const token = generateVerifySessionToken();
  const tokenHash = hashVerifySessionToken(token);
  const ttlMinutes = Math.max(1, Math.floor(params.ttlMinutes));

  const result = await pool.query<{ expires_at: string }>(
    `INSERT INTO verify_sessions (
      token_hash,
      document_id,
      ip_address,
      user_agent,
      expires_at
    ) VALUES ($1, $2, $3::inet, $4, NOW() + ($5 || ' minutes')::interval)
    RETURNING expires_at::text as expires_at`,
    [
      tokenHash,
      params.documentId,
      params.ipAddress,
      params.userAgent,
      String(ttlMinutes),
    ]
  );

  const expiresAt = result.rows[0]?.expires_at;
  return {
    token,
    expiresAt:
      expiresAt ?? new Date(Date.now() + ttlMinutes * 60_000).toISOString(),
  };
}

export async function verifyDocumentMatch(params: {
  identityNo: string;
  referenceNo: string;
  token?: string;
}): Promise<VerifyMatchRow | null> {
  const pool = getPool();
  if (params.token) {
    const result = await pool.query<VerifyMatchRow>(
      `SELECT
        d.id,
        d.doc_status,
        d.barcode_id,
        d.reference_no,
        d.owner_full_name,
        d.university_name,
        d.pdf_url,
        d.pdf_hash
      FROM documents d
      WHERE d.token = $1
        AND d.reference_no = $2
        AND d.owner_identity_no = $3
      LIMIT 1`,
      [params.token, params.referenceNo, params.identityNo]
    );
    return result.rows[0] ?? null;
  }

  const result = await pool.query<VerifyMatchRow>(
    `SELECT
      d.id,
      d.doc_status,
      d.barcode_id,
      d.reference_no,
      d.owner_full_name,
      d.university_name,
      d.pdf_url,
      d.pdf_hash
     FROM documents d
     WHERE d.reference_no = $1
         AND d.owner_identity_no = $2
     LIMIT 1`,
    [params.referenceNo, params.identityNo]
  );
  return result.rows[0] ?? null;
}

export async function getVerifyPrefillByToken(params: {
  token: string;
}): Promise<{ referenceNo: string; identityNo: string } | null> {
  const pool = getPool();
  const result = await pool.query<{
    reference_no: string;
    owner_identity_no: string;
  }>(
    `SELECT reference_no, owner_identity_no
       FROM documents
       WHERE token = $1
       LIMIT 1`,
    [params.token]
  );

  const row = result.rows[0];
  if (!row?.reference_no || !row?.owner_identity_no) return null;
  return { referenceNo: row.reference_no, identityNo: row.owner_identity_no };
}

export async function getVerifySessionDocument(params: {
  token: string;
  documentId: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<{ ok: true } | { ok: false }> {
  const pool = getPool();
  const tokenHash = hashVerifySessionToken(params.token);
  const result = await pool.query<{ ok: boolean }>(
    `SELECT EXISTS(
      SELECT 1
      FROM verify_sessions
      WHERE token_hash = $1
        AND document_id = $2
        AND expires_at > NOW()
        AND (ip_address IS NULL OR ip_address = $3::inet)
        AND (user_agent IS NULL OR user_agent = $4)
    ) as ok`,
    [tokenHash, params.documentId, params.ipAddress, params.userAgent]
  );

  return result.rows[0]?.ok ? { ok: true } : { ok: false };
}
