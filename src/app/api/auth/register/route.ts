import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { createUser } from "@/lib/db/queries/users";

type RegisterBody = {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
};

function isLikelyEmail(value: string): boolean {
  // Minimal check; DB has UNIQUE + citext.
  return value.includes("@") && value.includes(".");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;

  const fullName =
    typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!fullName || !email || !password) {
    return Response.json(
      { ok: false, error: "Full name, email and password are required" },
      { status: 400 }
    );
  }

  if (!isLikelyEmail(email)) {
    return Response.json(
      { ok: false, error: "Invalid email" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return Response.json(
      { ok: false, error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);

  let userId: string;
  let role: string;
  try {
    const created = await createUser({
      fullName,
      email,
      passwordHash,
      role: "staff",
    });
    userId = created.id;
    role = created.role;
  } catch (err: unknown) {
    const pgCode =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: unknown }).code
        : undefined;

    // Postgres unique_violation
    if (pgCode === "23505") {
      return Response.json(
        { ok: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { ok: false, error: "Failed to create account" },
      { status: 500 }
    );
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  await createSession({ userId, ipAddress, userAgent });

  return Response.json({
    ok: true,
    user: {
      id: userId,
      fullName,
      email,
      role,
    },
  });
}
