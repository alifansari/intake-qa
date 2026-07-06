// Local-dev database connection + migration runner for Intake QA v1.
//
// Uses Node's built-in `node:sqlite` (Node >= 22.5) so there is NO native
// dependency to compile and nothing extra to install. For production this is
// the seam where a Postgres client would slot in; the SQL in db/migrations is
// written to port cleanly (see the header of 0001_init.sql).

import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, "migrations");
const DATA_DIR = join(HERE, "..", "data");
export const DEFAULT_DB_PATH = join(DATA_DIR, "intakeqa.db");

// Open (creating if needed) the SQLite database with foreign keys enforced.
export function openDb(dbPath = DEFAULT_DB_PATH) {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

// Apply any migration files (db/migrations/*.sql) not yet recorded. Idempotent:
// safe to run repeatedly; only unapplied files run, each in its own transaction.
export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
  `);

  const applied = new Set(
    db.prepare("SELECT filename FROM _migrations").all().map((r) => r.filename)
  );
  const files = readdirSync(MIGRATIONS_DIR)
    // Ignore stray macOS/Finder duplicates like "0016_report_status 2.sql" — real
    // migration filenames never contain a space. Prevents non-idempotent migrations
    // (e.g. ADD COLUMN) from running twice.
    .filter((f) => f.endsWith(".sql") && !f.includes(" "))
    .sort();

  const ran = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(file);
      db.exec("COMMIT");
      ran.push(file);
    } catch (err) {
      db.exec("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${err.message}`);
    }
  }
  return ran;
}

// Convenience: open + migrate in one call.
export function openMigratedDb(dbPath = DEFAULT_DB_PATH) {
  const db = openDb(dbPath);
  migrate(db);
  return db;
}
