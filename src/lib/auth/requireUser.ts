import {
  hashSessionToken,
  readSessionTokenFromCookies,
} from "@/lib/auth/session";
import { getActiveSessionByHash } from "@/lib/db/queries/sessions";

export async function requireUserId(): Promise<string> {
  const token = await readSessionTokenFromCookies();
  if (!token) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const session = await getActiveSessionByHash(hashSessionToken(token));
  if (!session) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  return session.user_id;
}
