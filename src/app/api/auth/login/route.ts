import { getUserByEmail, touchUserLastLogin } from "@/lib/db/queries/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginBody | null;

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return Response.json(
      { ok: false, error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await getUserByEmail(email);
  if (!user || !user.is_active) {
    return Response.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return Response.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  await createSession({ userId: user.id, ipAddress, userAgent });
  await touchUserLastLogin(user.id);

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    },
  });
}
