import { Pool } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

function shouldUseSsl(databaseUrl: string): boolean {
  const url = databaseUrl.toLowerCase();
  return (
    url.includes("sslmode=require") ||
    url.startsWith("postgresql://") ||
    url.startsWith("postgres://")
  );
}

export function getPool(): Pool {
  if (global.__pgPool) return global.__pgPool;

  const rawCandidate =
    (typeof process.env.DATABASE_URL === "string" &&
      process.env.DATABASE_URL) ||
    (typeof process.env.POSTGRES_URL === "string" &&
      process.env.POSTGRES_URL) ||
    (typeof process.env.POSTGRES_PRISMA_URL === "string" &&
      process.env.POSTGRES_PRISMA_URL) ||
    "";
  const raw = rawCandidate;
  const trimmed = raw.trim();
  const connectionString =
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ? trimmed.slice(1, -1)
      : trimmed;

  if (!connectionString) {
    throw new Error(
      "Database connection URL is required. Set DATABASE_URL (or on Vercel Postgres: POSTGRES_URL / POSTGRES_PRISMA_URL). Do not include surrounding quotes."
    );
  }

  global.__pgPool = new Pool({
    connectionString,
    ssl: shouldUseSsl(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  return global.__pgPool;
}
