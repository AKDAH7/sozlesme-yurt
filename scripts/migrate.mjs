import fs from "fs";
import path from "path";
import pg from "pg";

const { Client } = pg;

function printHelp() {
  // Keep it minimal and safe.
  console.log("Usage:");
  console.log("  npm run migrate            # apply pending migrations");
  console.log("  npm run migrate -- --help  # show this help");
  console.log(
    "  npm run migrate -- --dry-run  # list migrations without applying"
  );
}

function loadDotEnvIfPresent(projectRoot) {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const dryRun = args.includes("--dry-run");

  const projectRoot = process.cwd();
  loadDotEnvIfPresent(projectRoot);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required (set it in env or .env)");
    process.exit(1);
  }

  const migrationsDir = path.join(
    projectRoot,
    "src",
    "lib",
    "db",
    "migrations"
  );
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations folder not found: ${migrationsDir}`);
    process.exit(1);
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  if (migrationFiles.length === 0) {
    console.log("No migrations found.");
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT NOW()
      )`
    );

    const applied = await client.query("SELECT id FROM schema_migrations");
    const appliedSet = new Set(applied.rows.map((r) => r.id));

    if (dryRun) {
      for (const file of migrationFiles) {
        console.log(`${appliedSet.has(file) ? "=" : ">"} ${file}`);
      }
      return;
    }

    for (const file of migrationFiles) {
      if (appliedSet.has(file)) {
        console.log(`= Skipping ${file} (already applied)`);
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, "utf8");

      console.log(`> Applying ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        console.log(`✓ Applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`✗ Failed ${file}`);
        throw err;
      }
    }

    console.log("All migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
