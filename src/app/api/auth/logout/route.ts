import {
  readSessionTokenFromCookies,
  destroySession,
} from "@/lib/auth/session";

export async function POST() {
  const token = await readSessionTokenFromCookies();
  await destroySession(token);
  return Response.json({ ok: true });
}
