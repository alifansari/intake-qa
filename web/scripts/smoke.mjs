// Config / readiness PREFLIGHT — a fast, no-network sanity check of the things
// that would silently break the pilot. It does NOT run the pipeline (that is
// e2e-synthetic.mjs); it checks that the pieces are in place. Run from web/:
//
//   npm run smoke
//
// Emits a PASS / WARN / FAIL line per check. FAIL = a hard problem (missing
// migration, schema won't build) -> non-zero exit. WARN = a pilot-time notice
// (e.g. an API key not set yet) that is fine locally but must be resolved before
// go-live. This never touches the network, never sends, and uses a throwaway
// temp SQLite DB so it is safe to run anywhere, anytime.

import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { openMigratedDb } from "../db/connection.mjs";
import { isTestMode, killSwitchEngaged } from "../messaging/compliance.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, "..");

let failures = 0;
let warnings = 0;
function pass(msg) { console.log(`PASS ${msg}`); }
function warn(msg) { warnings++; console.log(`WARN ${msg}`); }
function fail(msg) { failures++; console.log(`FAIL ${msg}`); }

// 1. Both migration tracks exist and have matching file numbers. A table added
//    to SQLite but not Postgres (or vice versa) diverges tests from production.
function checkMigrations() {
  const sqliteDir = join(WEB, "db", "migrations");
  const pgDir = join(WEB, "supabase", "migrations");
  const nums = (dir) =>
    new Set(
      readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .map((f) => f.slice(0, 4))
    );
  const s = nums(sqliteDir);
  const p = nums(pgDir);
  const onlySqlite = [...s].filter((n) => !p.has(n));
  const onlyPg = [...p].filter((n) => !s.has(n));
  if (onlySqlite.length || onlyPg.length) {
    fail(
      `migration tracks diverge — SQLite-only: [${onlySqlite.join(",")}], Postgres-only: [${onlyPg.join(",")}]`
    );
  } else {
    pass(`migration tracks aligned (${s.size} migrations in each of SQLite + Postgres)`);
  }
}

// 2. The SQLite schema builds cleanly and the tables the pilot depends on exist.
function checkSchema() {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-smoke-"));
  let db;
  try {
    db = openMigratedDb(join(dir, "smoke.db"));
    const required = [
      "firms", "calls", "flags", "conversations", "messages",
      "handoffs", "outcomes", "recoveries",
      "demo_calls", "demo_leads", "template_versions", "errors",
    ];
    const present = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name)
    );
    const missing = required.filter((t) => !present.has(t));
    if (missing.length) fail(`schema missing tables: ${missing.join(", ")}`);
    else pass(`schema builds; all ${required.length} pilot tables present`);
  } catch (e) {
    fail(`schema build threw: ${e.message}`);
  } finally {
    if (db) db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

// 3. Compliance posture. TEST_MODE must be ON for the pilot; a real SMS path
//    should never be live before A2P 10DLC. KILL_SWITCH state is informational.
function checkCompliance(env) {
  if (isTestMode(env)) {
    pass("TEST_MODE is ON — sends are simulated (correct for the pilot)");
  } else {
    warn("TEST_MODE is OFF — real SMS can be sent. Only correct after A2P 10DLC approval.");
  }
  if (killSwitchEngaged(env)) pass("global KILL_SWITCH engaged — all sends halted");
  else console.log("INFO global KILL_SWITCH is clear (sending still gated by approval + per-firm switch)");
}

// 4. Config presence. Missing keys are WARN (fine locally, blocking at go-live).
function checkEnv(env) {
  const keys = [
    ["ANTHROPIC_API_KEY", "score calls"],
    ["ASSEMBLYAI_API_KEY", "transcribe audio"],
  ];
  for (const [k, why] of keys) {
    if (env[k]) pass(`${k} is set (needed to ${why})`);
    else warn(`${k} not set — needed to ${why} (fine for offline dev / tests)`);
  }
  const dbConfigured = Boolean(env.DATABASE_URL) || Boolean(env.NEXT_PUBLIC_SUPABASE_URL);
  if (dbConfigured) pass("a hosted database is configured (DATABASE_URL / Supabase)");
  else warn("no hosted DB configured — the pilot falls back to local SQLite");
}

console.log("Intake QA — readiness preflight\n");
checkMigrations();
checkSchema();
checkCompliance(process.env);
checkEnv(process.env);

console.log(`\n${failures ? "FAIL" : "OK"} — ${failures} failure(s), ${warnings} warning(s).`);
process.exit(failures ? 1 : 0);
