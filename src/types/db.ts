export type UserRole = "admin" | "staff" | "accounting" | "viewer" | "company";
export type DocStatus = "active" | "inactive";
export type RequesterType = "company" | "direct";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "other";
export type TrackingStatus =
  | "created"
  | "delivered_to_student"
  | "delivered_to_agent"
  | "residence_file_delivered"
  | "residence_file_received"
  | "shipped"
  | "received"
  | "cancelled";
export type PdfStorageType = "local" | "s3" | "db";
export type AuditActionType =
  | "create"
  | "update"
  | "status_change"
  | "payment_added"
  | "revoke"
  | "pdf_view"
  | "pdf_download"
  | "tracking_change";

export type TemplateLanguage = "tr" | "en" | "ar" | "multi";
export type TemplateVariableType = "text" | "date" | "number";
