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

  const raw = typeof process.env.DATABASE_URL === "string" ? process.env.DATABASE_URL : "";
  const trimmed = raw.trim();
  const connectionString =
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ? trimmed.slice(1, -1)
      : trimmed;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required (set it as an environment variable; do not include surrounding quotes)"
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
