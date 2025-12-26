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

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  global.__pgPool = new Pool({
    connectionString,
    ssl: shouldUseSsl(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  return global.__pgPool;
}
