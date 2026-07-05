// Apply specific Supabase/Postgres migration files to DATABASE_URL.
//
// The local runner (db/migrate.mjs) only touches SQLite. This applies the
// Postgres twins in web/supabase/migrations to the live database. It runs ONLY
// the migration prefixes you pass (so you never blindly re-run the whole history),
// each in its own transaction. The migrations are written idempotently
// (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING),
// so re-running a given one is safe.
//
// Usage: node db/migrate-postgres.mjs 0014 0015
//        (reads DATABASE_URL from the environment, or from web/.env.local)

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIG_DIR = join(HERE, "..", "supabase", "migrations");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(join(HERE, "..", ".env.local"), "utf8");
    const line = env.split("\n").find((l) => l.trim().startsWith("DATABASE_URL="));
    if (line) return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env.local */
  }
  return null;
}

const prefixes = process.argv.slice(2);
if (prefixes.length === 0) {
  console.error("Usage: node db/migrate-postgres.mjs <prefix> [<prefix>...]  (e.g., 0014 0015)");
  process.exit(1);
}

const url = loadDatabaseUrl();
if (!url) {
  console.error("DATABASE_URL not found in env or web/.env.local — cannot apply Postgres migrations.");
  process.exit(1);
}

const files = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql") && !f.includes(" 2"))
  .sort();

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  for (const prefix of prefixes) {
    const file = files.find((f) => f.startsWith(prefix + "_") || f.startsWith(prefix));
    if (!file) {
      console.error(`No migration file found for prefix "${prefix}" in ${MIG_DIR}`);
      process.exitCode = 1;
      continue;
    }
    const sql = readFileSync(join(MIG_DIR, file), "utf8");
    process.stdout.write(`Applying ${file} ... `);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("COMMIT");
      console.log("ok");
    } catch (err) {
      await client.query("ROLLBACK");
      console.log("FAILED");
      console.error(err.message);
      process.exitCode = 1;
    }
  }
} finally {
  await client.end();
}
