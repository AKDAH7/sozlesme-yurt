import crypto from "crypto";

import type {
  AuditActionType,
  DocStatus,
  PaymentMethod,
  PaymentStatus,
  PdfStorageType,
  RequesterType,
  TrackingStatus,
} from "@/types/db";
import { getPool } from "@/lib/db/pool";
import { insertDocumentAuditLog } from "@/lib/security/audit";

export type DocumentRow = {
  id: string;
  token: string;
  barcode_id: string;
  reference_no: string;
  created_by_user_id: string;
  owner_full_name: string;
  owner_identity_no: string;
  owner_birth_date: string;
  university_name: string;
  dorm_name: string | null;
  dorm_address: string | null;
  issue_date: string;
  footer_datetime: string;
  doc_status: DocStatus;
  tracking_status: TrackingStatus;
  requester_type: RequesterType;
  company_id: string | null;
  direct_customer_name: string | null;
  direct_customer_phone: string | null;
  price_amount: string;
  price_currency: string;
  payment_status: PaymentStatus;

  pdf_storage_type: PdfStorageType;
  pdf_url: string | null;
  pdf_hash: string | null;

  template_id: string | null;
  template_version: number | null;
  template_values: Record<string, unknown> | null;

  created_at: string;
  updated_at: string;
};

export type DocumentListRow = {
  id: string;
  reference_no: string;
  barcode_id: string;
  doc_status: DocStatus;
  tracking_status: TrackingStatus;
  payment_status: PaymentStatus;
  price_amount: string;
  price_currency: string;
  owner_full_name: string;
  owner_identity_no: string;
  requester_type: RequesterType;
  company_name: string | null;
  direct_customer_name: string | null;
  created_at: string;
  creator_full_name: string;

  pdf_url: string | null;
  pdf_hash: string | null;
};

export type DocumentPdfData = {
  id: string;
  token: string;
  barcode_id: string;
  reference_no: string;
  owner_full_name: string;
  owner_identity_no: string;
  owner_birth_date: string;
  university_name: string;
  dorm_name: string | null;
  dorm_address: string | null;
  issue_date: string;
  footer_datetime: string;
  requester_type: RequesterType;
  company_name: string | null;
  direct_customer_name: string | null;
  price_amount: string;
  price_currency: string;
  pdf_storage_type: PdfStorageType;
  pdf_url: string | null;
  pdf_hash: string | null;

  template_id: string | null;
  template_version: number | null;
  template_values: Record<string, unknown> | null;
};

export type TrackingHistoryRow = {
  id: string;
  document_id: string;
  from_status: TrackingStatus | null;
  to_status: TrackingStatus;
  changed_by_user_id: string;
  changed_by_full_name: string;
  changed_at: string;
  note: string | null;
};

export type PaymentRow = {
  id: string;
  document_id: string;
  received_amount: string;
  currency: string;
  method: PaymentMethod;
  payment_date: string;
  received_by_user_id: string;
  received_by_full_name: string;
  receipt_no: string | null;
  note: string | null;
  created_at: string;
};

export type PaymentSummary = {
  price_amount: string;
  price_currency: string;
  paid_amount: string;
  remaining_amount: string;
  payment_status: PaymentStatus;
};

export type CreateDocumentInput = {
  createdByUserId: string;
  ownerFullName: string;
  ownerIdentityNo: string;
  ownerBirthDate: Date;

  universityName: string;
  dormName: string | null;
  dormAddress: string | null;
  issueDate: Date;
  footerDatetime: Date;

  requesterType: RequesterType;
  companyId: string | null;
  directCustomerName: string | null;
  directCustomerPhone: string | null;

  priceAmount: number;
  priceCurrency: string;

  templateId: string | null;
  templateVersion: number | null;
  templateValues: Record<string, unknown> | null;
};

export type CreateDocumentGenerated = {
  token: string;
  barcodeId: string;
  referenceNo: string;
};

function randomDigits(length: number): string {
  let out = "";
  while (out.length < length) {
    out += (
      crypto.randomBytes(length).toString("hex").replace(/\D/g, "") +
      "0000000000"
    ).slice(0, length);
  }
  return out.slice(0, length);
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function generateBarcodeId(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `GCGM${yy}${mm}${dd}-${randomDigits(6)}`;
}

function generateReferenceNo(now = new Date()): string {
  const yyyymmdd = `${now.getUTCFullYear()}${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `REF-${yyyymmdd}-${randomDigits(6)}`;
}

export function generateCreateDocumentIdentifiers(): CreateDocumentGenerated {
  const now = new Date();
  return {
    token: generateToken(),
    barcodeId: generateBarcodeId(now),
    referenceNo: generateReferenceNo(now),
  };
}

function isUniqueViolation(error: unknown): boolean {
  const anyErr = error as { code?: string } | null;
  return anyErr?.code === "23505";
}

export async function createDocument(params: {
  input: CreateDocumentInput;
  generated?: CreateDocumentGenerated;
  audit?: {
    actionByUserId: string;
    ipAddress: string | null;
    userAgent: string | null;
    detailsJson?: Record<string, unknown>;
  };
}): Promise<
  Pick<
    DocumentRow,
    "id" | "token" | "barcode_id" | "reference_no" | "created_at"
  >
> {
  const pool = getPool();
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const generated = params.generated ?? generateCreateDocumentIdentifiers();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query<{
        id: string;
        token: string;
        barcode_id: string;
        reference_no: string;
        created_at: string;
      }>(
        `INSERT INTO documents (
						token, barcode_id, reference_no,
						created_by_user_id,
						owner_full_name, owner_identity_no, owner_birth_date,
						university_name, dorm_name, dorm_address, issue_date, footer_datetime,
						requester_type, company_id, direct_customer_name, direct_customer_phone,
						price_amount, price_currency,
						template_id, template_version, template_values
					)
					VALUES (
						$1, $2, $3,
						$4,
						$5, $6, $7,
						$8, $9, $10, $11, $12,
						$13, $14, $15, $16,
						$17, $18,
						$19, $20, $21::jsonb
					)
					RETURNING id, token, barcode_id, reference_no, created_at`,
        [
          generated.token,
          generated.barcodeId,
          generated.referenceNo,
          params.input.createdByUserId,
          params.input.ownerFullName,
          params.input.ownerIdentityNo,
          params.input.ownerBirthDate,
          params.input.universityName,
          params.input.dormName,
          params.input.dormAddress,
          params.input.issueDate,
          params.input.footerDatetime,
          params.input.requesterType,
          params.input.companyId,
          params.input.directCustomerName,
          params.input.directCustomerPhone,
          params.input.priceAmount,
          params.input.priceCurrency,
          params.input.templateId,
          params.input.templateVersion,
          params.input.templateValues
            ? JSON.stringify(params.input.templateValues)
            : null,
        ]
      );

      const row = result.rows[0];
      if (!row) throw new Error("Failed to create document");

      if (params.audit) {
        await insertDocumentAuditLog(
          {
            documentId: row.id,
            actionType: "create" satisfies AuditActionType,
            actionByUserId: params.audit.actionByUserId,
            ipAddress: params.audit.ipAddress,
            userAgent: params.audit.userAgent,
            detailsJson: params.audit.detailsJson,
          },
          client
        );
      }

      await client.query("COMMIT");
      return {
        id: row.id,
        token: row.token,
        barcode_id: row.barcode_id,
        reference_no: row.reference_no,
        created_at: row.created_at,
      };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (isUniqueViolation(err) && attempt < maxAttempts) {
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }

  throw new Error("Failed to create unique document identifiers");
}

export async function getDocumentById(id: string): Promise<DocumentRow | null> {
  const pool = getPool();
  const result = await pool.query<DocumentRow>(
    `SELECT
			id, token, barcode_id, reference_no,
			created_by_user_id,
      owner_full_name, owner_identity_no, owner_birth_date::text as owner_birth_date,
			university_name, dorm_name, dorm_address, issue_date, footer_datetime,
			doc_status, tracking_status,
			requester_type, company_id, direct_customer_name, direct_customer_phone,
			price_amount::text as price_amount, price_currency, payment_status,
			pdf_storage_type, pdf_url, pdf_hash,
      template_id,
      template_version,
      template_values,
      created_at::text as created_at, updated_at::text as updated_at,
      issue_date::text as issue_date,
      footer_datetime::text as footer_datetime
		 FROM documents
		 WHERE id = $1
		 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getDocumentPdfData(
  id: string
): Promise<DocumentPdfData | null> {
  const pool = getPool();
  const result = await pool.query<DocumentPdfData>(
    `SELECT
      d.id,
      d.token,
      d.barcode_id,
      d.reference_no,
      d.owner_full_name,
      d.owner_identity_no,
      d.owner_birth_date::text as owner_birth_date,
      d.university_name,
      d.dorm_name,
      d.dorm_address,
      d.issue_date::text as issue_date,
      d.footer_datetime::text as footer_datetime,
      d.requester_type,
      c.company_name,
      d.direct_customer_name,
      d.price_amount::text as price_amount,
      d.price_currency,
      d.pdf_storage_type,
      d.pdf_url,
      d.pdf_hash,
      d.template_id,
      d.template_version,
      d.template_values
     FROM documents d
     LEFT JOIN companies c ON c.id = d.company_id
     WHERE d.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function listDocuments(params: {
  page: number;
  pageSize: number;
  q: string;
  status: DocStatus | "";
  trackingStatus?: TrackingStatus | "";
  paymentStatus?: PaymentStatus | "";
  requesterType?: RequesterType | "";
  companyId?: string | "";
  sortDir?: "asc" | "desc";
}): Promise<{ rows: DocumentListRow[]; total: number }> {
  const pool = getPool();

  const page =
    Number.isFinite(params.page) && params.page > 0
      ? Math.floor(params.page)
      : 1;
  const pageSize =
    Number.isFinite(params.pageSize) && params.pageSize > 0
      ? Math.min(100, Math.floor(params.pageSize))
      : 20;
  const offset = (page - 1) * pageSize;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const trackingStatus = params.trackingStatus ?? "";
  const paymentStatus = params.paymentStatus ?? "";
  const requesterType = params.requesterType ?? "";
  const companyId = (params.companyId ?? "").trim();
  const sortDir = params.sortDir === "asc" ? "ASC" : "DESC";

  const where: string[] = [];
  const values: unknown[] = [];
  const add = (clause: string, value?: unknown) => {
    where.push(clause);
    if (typeof value !== "undefined") values.push(value);
  };

  if (q) {
    add(
      `(d.reference_no ILIKE $${values.length + 1}
				OR d.barcode_id ILIKE $${values.length + 1}
				OR d.owner_full_name ILIKE $${values.length + 1}
				OR d.owner_identity_no ILIKE $${values.length + 1})`,
      `%${q}%`
    );
  }

  if (status) {
    add(`d.doc_status = $${values.length + 1}`, status);
  }

  if (trackingStatus) {
    add(`d.tracking_status = $${values.length + 1}`, trackingStatus);
  }

  if (paymentStatus) {
    add(`d.payment_status = $${values.length + 1}`, paymentStatus);
  }

  if (requesterType) {
    add(`d.requester_type = $${values.length + 1}`, requesterType);
  }

  if (companyId) {
    add(`d.company_id = $${values.length + 1}`, companyId);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text as total
		 FROM documents d
		 ${whereSql}`,
    values
  );
  const total = Number(totalResult.rows[0]?.total ?? "0");

  const rowsResult = await pool.query<DocumentListRow>(
    `SELECT
			d.id,
			d.reference_no,
			d.barcode_id,
			d.doc_status,
			d.tracking_status,
			d.payment_status,
			d.price_amount::text as price_amount,
			d.price_currency,
			d.owner_full_name,
			d.owner_identity_no,
			d.requester_type,
			c.company_name,
			d.direct_customer_name,
      d.created_at::text as created_at,
      u.full_name as creator_full_name,
      d.pdf_url,
      d.pdf_hash
		 FROM documents d
		 JOIN users u ON u.id = d.created_by_user_id
		 LEFT JOIN companies c ON c.id = d.company_id
		 ${whereSql}
     ORDER BY d.created_at ${sortDir}
		 LIMIT $${values.length + 1}
		 OFFSET $${values.length + 2}`,
    [...values, pageSize, offset]
  );

  return { rows: rowsResult.rows, total };
}

export async function updateDocumentPdfInfo(params: {
  documentId: string;
  storageType: PdfStorageType;
  pdfUrl: string;
  pdfHash: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<{ pdf_url: string; pdf_hash: string }> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updated = await client.query<{ pdf_url: string; pdf_hash: string }>(
      `UPDATE documents
       SET pdf_storage_type = $2,
           pdf_url = $3,
           pdf_hash = $4
       WHERE id = $1
       RETURNING pdf_url, pdf_hash`,
      [params.documentId, params.storageType, params.pdfUrl, params.pdfHash]
    );
    const row = updated.rows[0];
    if (!row) throw Object.assign(new Error("Not found"), { status: 404 });

    await insertDocumentAuditLog(
      {
        documentId: params.documentId,
        actionType: "update" satisfies AuditActionType,
        actionByUserId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        detailsJson: {
          pdf_storage_type: params.storageType,
          pdf_url: params.pdfUrl,
          pdf_hash: params.pdfHash,
          kind: "pdf_generate",
        },
      },
      client
    );

    await client.query("COMMIT");
    return row;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function updateDocumentStatus(params: {
  documentId: string;
  docStatus: DocStatus;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<{ doc_status: DocStatus }> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ doc_status: DocStatus }>(
      `SELECT doc_status
       FROM documents
       WHERE id = $1
       FOR UPDATE`,
      [params.documentId]
    );
    const before = current.rows[0]?.doc_status;
    if (!before) {
      throw Object.assign(new Error("Not found"), { status: 404 });
    }

    const updated = await client.query<{ doc_status: DocStatus }>(
      `UPDATE documents
       SET doc_status = $2
       WHERE id = $1
       RETURNING doc_status`,
      [params.documentId, params.docStatus]
    );
    const row = updated.rows[0];
    if (!row) throw new Error("Failed to update status");

    await insertDocumentAuditLog(
      {
        documentId: params.documentId,
        actionType: "status_change" satisfies AuditActionType,
        actionByUserId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        detailsJson: { from: before, to: row.doc_status },
      },
      client
    );

    await client.query("COMMIT");
    return row;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function changeTrackingStatus(params: {
  documentId: string;
  toStatus: TrackingStatus;
  note: string | null;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<{ tracking_status: TrackingStatus; historyId: string }> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query<{ tracking_status: TrackingStatus }>(
      `SELECT tracking_status
       FROM documents
       WHERE id = $1
       FOR UPDATE`,
      [params.documentId]
    );
    const fromStatus = current.rows[0]?.tracking_status;
    if (!fromStatus) {
      throw Object.assign(new Error("Not found"), { status: 404 });
    }

    const updated = await client.query<{ tracking_status: TrackingStatus }>(
      `UPDATE documents
       SET tracking_status = $2
       WHERE id = $1
       RETURNING tracking_status`,
      [params.documentId, params.toStatus]
    );
    const row = updated.rows[0];
    if (!row) throw new Error("Failed to update tracking");

    const insertedHistory = await client.query<{ id: string }>(
      `INSERT INTO tracking_history (
        document_id, from_status, to_status, changed_by_user_id, note
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        params.documentId,
        fromStatus,
        params.toStatus,
        params.userId,
        params.note,
      ]
    );
    const historyId = insertedHistory.rows[0]?.id;
    if (!historyId) throw new Error("Failed to insert tracking history");

    await insertDocumentAuditLog(
      {
        documentId: params.documentId,
        actionType: "tracking_change" satisfies AuditActionType,
        actionByUserId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        detailsJson: {
          from: fromStatus,
          to: params.toStatus,
          note: params.note,
        },
      },
      client
    );

    await client.query("COMMIT");
    return { tracking_status: row.tracking_status, historyId };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function listTrackingHistory(
  documentId: string
): Promise<TrackingHistoryRow[]> {
  const pool = getPool();
  const result = await pool.query<TrackingHistoryRow>(
    `SELECT
      th.id,
      th.document_id,
      th.from_status,
      th.to_status,
      th.changed_by_user_id,
      u.full_name as changed_by_full_name,
      th.changed_at::text as changed_at,
      th.note
     FROM tracking_history th
     JOIN users u ON u.id = th.changed_by_user_id
     WHERE th.document_id = $1
     ORDER BY th.changed_at DESC`,
    [documentId]
  );
  return result.rows;
}

export async function getPaymentSummary(
  documentId: string
): Promise<PaymentSummary> {
  const pool = getPool();
  const result = await pool.query<PaymentSummary>(
    `SELECT
      d.price_amount::text as price_amount,
      d.price_currency,
      COALESCE(SUM(p.received_amount), 0)::text as paid_amount,
      GREATEST(d.price_amount - COALESCE(SUM(p.received_amount), 0), 0)::text as remaining_amount,
      d.payment_status
     FROM documents d
     LEFT JOIN payments p ON p.document_id = d.id
     WHERE d.id = $1
     GROUP BY d.id, d.price_amount, d.price_currency, d.payment_status`,
    [documentId]
  );
  const row = result.rows[0];
  if (!row) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  return row;
}

export async function listPayments(documentId: string): Promise<PaymentRow[]> {
  const pool = getPool();
  const result = await pool.query<PaymentRow>(
    `SELECT
      p.id,
      p.document_id,
      p.received_amount::text as received_amount,
      p.currency,
      p.method,
      p.payment_date::text as payment_date,
      p.received_by_user_id,
      u.full_name as received_by_full_name,
      p.receipt_no,
      p.note,
      p.created_at::text as created_at
     FROM payments p
     JOIN users u ON u.id = p.received_by_user_id
     WHERE p.document_id = $1
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    [documentId]
  );
  return result.rows;
}

function computePaymentStatus(
  priceAmount: number,
  paidAmount: number
): PaymentStatus {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount + 1e-9 >= priceAmount) return "paid";
  return "partial";
}

export async function addPaymentAndUpdateStatus(params: {
  documentId: string;
  receivedAmount: number;
  currency: string;
  method: PaymentMethod;
  paymentDate: Date;
  receiptNo: string | null;
  note: string | null;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<{ paymentId: string; payment_status: PaymentStatus }> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const doc = await client.query<{
      price_amount: string;
      price_currency: string;
    }>(
      `SELECT price_amount::text as price_amount, price_currency
       FROM documents
       WHERE id = $1
       FOR UPDATE`,
      [params.documentId]
    );
    const docRow = doc.rows[0];
    if (!docRow) {
      throw Object.assign(new Error("Not found"), { status: 404 });
    }
    if (docRow.price_currency !== params.currency) {
      throw Object.assign(
        new Error(
          `Payment currency must match document currency (${docRow.price_currency})`
        ),
        { status: 400 }
      );
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO payments (
        document_id,
        received_amount,
        currency,
        method,
        payment_date,
        received_by_user_id,
        receipt_no,
        note
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id`,
      [
        params.documentId,
        params.receivedAmount,
        params.currency,
        params.method,
        params.paymentDate,
        params.userId,
        params.receiptNo,
        params.note,
      ]
    );
    const paymentId = inserted.rows[0]?.id;
    if (!paymentId) throw new Error("Failed to insert payment");

    const sums = await client.query<{ paid_amount: string }>(
      `SELECT COALESCE(SUM(received_amount), 0)::text as paid_amount
       FROM payments
       WHERE document_id = $1`,
      [params.documentId]
    );
    const paidAmount = Number(sums.rows[0]?.paid_amount ?? "0");
    const priceAmount = Number(docRow.price_amount);
    const newStatus = computePaymentStatus(priceAmount, paidAmount);

    await client.query(
      `UPDATE documents
       SET payment_status = $2
       WHERE id = $1`,
      [params.documentId, newStatus]
    );

    await insertDocumentAuditLog(
      {
        documentId: params.documentId,
        actionType: "payment_added" satisfies AuditActionType,
        actionByUserId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        detailsJson: {
          paymentId,
          amount: params.receivedAmount,
          currency: params.currency,
          method: params.method,
          paymentDate: params.paymentDate.toISOString(),
          receiptNo: params.receiptNo,
        },
      },
      client
    );

    await client.query("COMMIT");
    return { paymentId, payment_status: newStatus };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
