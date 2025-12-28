import { NextResponse } from "next/server";

import {
  createVerifySession,
  hashIdentityNo,
  insertVerificationAttempt,
  verifyDocumentMatch,
} from "@/lib/db/queries/verify";
import { rateLimit } from "@/lib/security/rateLimit";
import { insertDocumentAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    return first || null;
  }
  return req.headers.get("x-real-ip");
}

type VerifyRequest = {
  token?: string;
  referenceNo: string;
  identityNo: string;
};

export async function POST(req: Request) {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  const rl = rateLimit({
    key: `verify:${ipAddress ?? "unknown"}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds ?? 60) },
      }
    );
  }

  let body: VerifyRequest;
  try {
    body = (await req.json()) as VerifyRequest;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Geçersiz istek." },
      { status: 400 }
    );
  }

  const token =
    typeof body.token === "string" && body.token.trim()
      ? body.token.trim()
      : undefined;
  const referenceNo =
    typeof body.referenceNo === "string" ? body.referenceNo.trim() : "";
  const identityNo =
    typeof body.identityNo === "string" ? body.identityNo.trim() : "";

  if (!referenceNo || !identityNo) {
    return NextResponse.json(
      {
        ok: false,
        message: "Lütfen referans numarası ve kimlik numarasını girin.",
      },
      { status: 400 }
    );
  }

  const identityNoHash = hashIdentityNo(identityNo);

  try {
    const match = await verifyDocumentMatch({
      identityNo,
      referenceNo,
      token,
    });

    if (!match) {
      await insertVerificationAttempt({
        ipAddress: ipAddress ?? "0.0.0.0",
        success: false,
        token: token ?? null,
        referenceNo,
        identityNoHash,
        birthDate: null,
      });

      await insertDocumentAuditLog({
        documentId: null,
        actionType: "update",
        actionByUserId: null,
        ipAddress: ipAddress,
        userAgent: userAgent ?? null,
        detailsJson: {
          event: "verify_fail",
          token_present: Boolean(token),
          reference_no: referenceNo,
        },
      });

      return NextResponse.json(
        { ok: false, message: "Bilgiler doğrulanamadı." },
        { status: 200 }
      );
    }

    await insertVerificationAttempt({
      ipAddress: ipAddress ?? "0.0.0.0",
      success: true,
      token: token ?? null,
      referenceNo,
      identityNoHash,
      birthDate: null,
    });

    await insertDocumentAuditLog({
      documentId: match.id,
      actionType: "update",
      actionByUserId: null,
      ipAddress: ipAddress,
      userAgent: userAgent ?? null,
      detailsJson: {
        event: "verify_success",
        token_present: Boolean(token),
        reference_no: referenceNo,
      },
    });

    const session = await createVerifySession({
      documentId: match.id,
      ipAddress,
      userAgent,
      ttlMinutes: 5,
    });

    return NextResponse.json({
      ok: true,
      result: {
        documentId: match.id,
        status: match.doc_status,
        referenceNo: match.reference_no,
        ownerFullName: match.owner_full_name,
        universityName: match.university_name,
        pdfReady: Boolean(match.pdf_url && match.pdf_hash),
      },
      verifySession: {
        token: session.token,
        expiresAt: session.expiresAt,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
