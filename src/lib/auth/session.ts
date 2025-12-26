import crypto from "crypto";
import { cookies } from "next/headers";

import { insertSession, revokeSessionByHash } from "@/lib/db/queries/sessions";

export const SESSION_COOKIE_NAME = "sid";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getSessionMaxAgeSeconds(): number {
  const days = Number(process.env.SESSION_MAX_DAYS ?? "7");
  if (!Number.isFinite(days) || days <= 0) return 7 * 24 * 60 * 60;
  return Math.floor(days * 24 * 60 * 60);
}

export async function readSessionTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function createSession(params: {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(rawToken);

  const maxAgeSeconds = getSessionMaxAgeSeconds();
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

  await insertSession({
    userId: params.userId,
    tokenHash,
    expiresAt,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  (await cookies()).set({
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function destroySession(token: string | null): Promise<void> {
  if (token) {
    await revokeSessionByHash(sha256Hex(token));
  }

  (await cookies()).set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function hashSessionToken(token: string): string {
  return sha256Hex(token);
}
