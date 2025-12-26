import type {
  DocStatus,
  RequesterType,
  TrackingStatus,
  PaymentStatus,
} from "@/types/db";

export type CreateDocumentRequestDto = {
  owner_full_name: string;
  owner_identity_no: string;
  owner_birth_date: string; // YYYY-MM-DD

  university_name: string;
  dorm_name?: string | null;
  dorm_address?: string | null;
  issue_date: string; // YYYY-MM-DD
  footer_datetime: string; // ISO or datetime-local

  requester_type: RequesterType;
  company_id?: string | null;
  direct_customer_name?: string | null;
  direct_customer_phone?: string | null;

  price_amount: number;
  price_currency: string;

  // optional template support (versioned)
  template_id?: string | null;
  template_version?: number | null;
  template_values?: Record<string, unknown> | null;

  // server-generated fields MUST NOT be sent by client
  token?: never;
  barcode_id?: never;
  reference_no?: never;
};

export type CreateDocumentResponseDto = {
  ok: true;
  document: {
    id: string;
    reference_no: string;
    barcode_id: string;
    token: string;
    created_at: string;
  };
};

export type DocumentDetailsDto = {
  id: string;
  reference_no: string;
  barcode_id: string;
  token: string;
  doc_status: DocStatus;
  tracking_status: TrackingStatus;
  payment_status: PaymentStatus;
  owner_full_name: string;
  owner_identity_no: string;
  owner_birth_date: string;
  university_name: string;
  dorm_name: string | null;
  dorm_address: string | null;
  issue_date: string;
  footer_datetime: string;
  requester_type: RequesterType;
  company_id: string | null;
  direct_customer_name: string | null;
  direct_customer_phone: string | null;
  price_amount: string;
  price_currency: string;
  created_at: string;
};

export type ListDocumentsResponseDto = {
  ok: true;
  page: number;
  pageSize: number;
  total: number;
  rows: Array<{
    id: string;
    creator_full_name: string;
    owner_full_name: string;
    owner_identity_no: string;
    reference_no: string;
    doc_status: DocStatus;
    tracking_status: TrackingStatus;
    payment_status: PaymentStatus;
    price_amount: string;
    price_currency: string;
    company_or_customer: string;
    created_at: string;
  }>;
};
