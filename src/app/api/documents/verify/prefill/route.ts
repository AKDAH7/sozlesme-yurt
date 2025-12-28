import { NextResponse } from "next/server";

import { getVerifyPrefillByToken } from "@/lib/db/queries/verify";
import { rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    return first || null;
  }
  return req.headers.get("x-real-ip");
}

export async function GET(req: Request) {
  const ipAddress = getClientIp(req);

  const rl = rateLimit({
    key: `verify_prefill:${ipAddress ?? "unknown"}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "too_many_requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds ?? 60) },
      }
    );
  }

  const url = new URL(req.url);
  const token = (url.searchParams.get("token") ?? "").trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "missing_token" },
      { status: 400 }
    );
  }

  const prefill = await getVerifyPrefillByToken({ token }).catch(() => null);
  if (!prefill) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    referenceNo: prefill.referenceNo,
    identityNo: prefill.identityNo,
  });
}
