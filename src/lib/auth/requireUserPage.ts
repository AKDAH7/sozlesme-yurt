import { redirect } from "next/navigation";

import {
  hashSessionToken,
  readSessionTokenFromCookies,
} from "@/lib/auth/session";
import { getActiveSessionByHash } from "@/lib/db/queries/sessions";

/**
 * Server Components helper:
 * - If not authenticated, redirects to the login page instead of throwing.
 * - Use `requireUserId()` (from `requireUser.ts`) in API routes.
 */
export async function requireUserIdOrRedirect(
  redirectTo: string = "/login"
): Promise<string> {
  const token = await readSessionTokenFromCookies();
  if (!token) {
    redirect(redirectTo);
  }

  const session = await getActiveSessionByHash(hashSessionToken(token));
  if (!session) {
    redirect(redirectTo);
  }

  return session.user_id;
}
