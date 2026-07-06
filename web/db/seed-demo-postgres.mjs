// Seed the labeled demo firm into the live Supabase/Postgres DB so the deployed
// /desk screens have something to show. Idempotent: if the demo firm already
// exists it exits without duplicating. Reads DATABASE_URL (env or web/.env.local).
//
// Usage: node db/seed-demo-postgres.mjs
//
// The demo firm is is_demo=true (excluded from real metrics) and clearly labeled
// (DEMO / TEST). Data mirrors scripts/seed-demo.mjs (shared CALLERS).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CALLERS, DEMO_FIRM_NAME } from "../scripts/seed-demo.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(join(HERE, "..", ".env.local"), "utf8");
    const line = env.split("\n").find((l) => l.trim().startsWith("DATABASE_URL="));
    if (line) return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch { /* none */ }
  return null;
}

const url = loadDatabaseUrl();
if (!url) { console.error("DATABASE_URL not found."); process.exit(1); }

const { default: pg } = await import("pg");
const c = new pg.Client({ connectionString: url });
await c.connect();
try {
  const existing = await c.query("SELECT id FROM firms WHERE name = $1", [DEMO_FIRM_NAME]);
  if (existing.rows[0]) {
    console.log(`Demo firm already present (${existing.rows[0].id}) — nothing to do.`);
    process.exit(0);
  }

  await c.query("BEGIN");
  const firm = await c.query(
    "INSERT INTO firms (name, avg_case_fee, kill_switch, is_demo) VALUES ($1, 12000, true, true) RETURNING id",
    [DEMO_FIRM_NAME]
  );
  const firmId = firm.rows[0].id;

  // 132 received = 128 analyzed + 3 excluded + 1 failed.
  const analyzed = [];
  const insCall = async (status, reason, n) => {
    const day = String((n % 28) + 1).padStart(2, "0");
    const r = await c.query(
      "INSERT INTO calls (firm_id, source, received_at, status, status_reason) VALUES ($1,'manual',$2,$3,$4) RETURNING id",
      [firmId, `2026-06-${day}T14:00:00Z`, status, reason]
    );
    return r.rows[0].id;
  };
  let n = 0;
  for (let i = 0; i < 128; i++) analyzed.push(await insCall("analyzed", null, n++));
  await insCall("excluded_duplicate", "Duplicate of an earlier recording", n++);
  await insCall("excluded_duplicate", "Duplicate of an earlier recording", n++);
  await insCall("excluded_not_intake", "Vendor call, not an intake", n++);
  await insCall("failed_audio_quality", "Audio too quiet to transcribe reliably", n++);

  let flags = 0;
  for (let i = 0; i < CALLERS.length; i++) {
    const cr = CALLERS[i];
    const callId = analyzed[i];
    await c.query("UPDATE calls SET caller_name = $1 WHERE id = $2", [cr.name, callId]);
    const f = await c.query(
      "INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable, reason, case_type) VALUES ($1,$2,$3,true,$4,$5) RETURNING id",
      [callId, firmId, cr.score, cr.reason, cr.caseType]
    );
    const flagId = f.rows[0].id;
    await c.query(
      "INSERT INTO flag_confidence (flag_id, confidence_tier, rubric_version) VALUES ($1,$2,'rubric-v1') ON CONFLICT (flag_id) DO NOTHING",
      [flagId, cr.tier]
    );
    await c.query(
      "INSERT INTO analysis_versions (flag_id, model_version, prompt_version, rubric_version) VALUES ($1,'claude-sonnet-4-6','sys-v3','rubric-v1')",
      [flagId]
    );
    for (const cit of cr.citations) {
      await c.query(
        "INSERT INTO transcript_citations (flag_id, fact_kind, start_ms, end_ms, verbatim_snippet, validation_score, status) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [flagId, cit.fact_kind, cit.start_ms, cit.end_ms, cit.verbatim_snippet, cit.validation_score, cit.status]
      );
    }
    flags++;
  }
  await c.query("COMMIT");
  console.log(`Seeded demo firm ${firmId}: ${n} calls, ${flags} leaks.`);
} catch (err) {
  await c.query("ROLLBACK");
  console.error("Seed failed, rolled back:", err.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
