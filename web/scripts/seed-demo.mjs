// Demo-data mode (item 15). Creates an obviously-synthetic firm — "Sunset & Vine
// Injury Law (DEMO)" — with fake callers, a full reconciliation set (132 = 128 +
// 3 + 1), and four leaked-signable flags in both confidence tiers with timestamped
// citations. Every row carries is_demo=1 so it is excluded from real metrics.
//
// Usage: `npm run seed:demo` (writes the default local SQLite DB). The core work is
// exported as seedDemo(db) so the test can run it against a temp DB.

import { openMigratedDb, DEFAULT_DB_PATH } from "../db/connection.mjs";

const CALLERS = [
  { initials: "J.R.", id: "#A-0142", name: "Jordan Rivera (TEST)", caseType: "Auto — rear-end", score: 84, tier: "strong",
    reason: "Rear-ended by company truck; driver admitted fault; treating; ready to proceed, no callback.",
    citations: [
      { fact_kind: "qualifying_fact", start_ms: 192000, end_ms: 196000, verbatim_snippet: "the other driver admitted it was his fault", status: "passed", validation_score: 97 },
      { fact_kind: "flag_rationale", start_ms: 500000, end_ms: 504000, verbatim_snippet: "I definitely want to move forward with this", status: "passed", validation_score: 95 },
    ] },
  { initials: "M.E.", id: "#A-0187", name: "María Elena (TEST)", caseType: "Slip & fall", score: 81, tier: "strong",
    reason: "Unmarked wet floor at grocery store; fractured wrist; incident report filed (Spanish-language call).",
    citations: [
      { fact_kind: "qualifying_fact", start_ms: 125000, end_ms: 130000, verbatim_snippet: "no había ningún letrero, me resbalé", status: "passed", validation_score: 93 },
    ] },
  { initials: "T.W.", id: "#A-0203", name: "Terry Wells (TEST)", caseType: "Dog bite", score: 66, tier: "moderate",
    reason: "Neighbor's dog; puncture wounds treated at ER; severity unclear on call.",
    citations: [
      { fact_kind: "qualifying_fact", start_ms: 108000, end_ms: 112000, verbatim_snippet: "the dog bit my arm and I went to the ER", status: "needs_review", validation_score: 86 },
    ] },
  { initials: "R.K.", id: "#A-0210", name: "Robin Klein (TEST)", caseType: "Auto — rear-end", score: 62, tier: "moderate",
    reason: "Low-speed collision; caller unsure of injury severity, some soreness.",
    citations: [
      { fact_kind: "qualifying_fact", start_ms: 362000, end_ms: 366000, verbatim_snippet: "my neck's been a little sore since", status: "needs_review", validation_score: 88 },
    ] },
];

export function seedDemo(db) {
  const s = {
    firm: db.prepare("INSERT INTO firms (name, avg_case_fee, kill_switch, is_demo) VALUES (?, 12000, 1, 1)"),
    call: db.prepare("INSERT INTO calls (firm_id, source, received_at, status, status_reason) VALUES (?, 'manual', ?, ?, ?)"),
    flag: db.prepare("INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable, reason, case_type) VALUES (?, ?, ?, 1, ?, ?)"),
    nameCall: db.prepare("UPDATE calls SET caller_name = ? WHERE id = ?"),
    conf: db.prepare("INSERT INTO flag_confidence (flag_id, confidence_tier, rubric_version) VALUES (?, ?, 'rubric-v1') ON CONFLICT (flag_id) DO NOTHING"),
    ver: db.prepare("INSERT INTO analysis_versions (flag_id, model_version, prompt_version, rubric_version) VALUES (?, 'claude-sonnet-4-6', 'sys-v3', 'rubric-v1')"),
    cite: db.prepare("INSERT INTO transcript_citations (flag_id, fact_kind, start_ms, end_ms, verbatim_snippet, validation_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)"),
  };

  const firmId = Number(s.firm.run("Sunset & Vine Injury Law (DEMO)").lastInsertRowid);
  const baseDay = 1; // June 2026 demo period
  let n = 0;
  const mkCall = (status, reason = null) => {
    n += 1;
    const day = String((baseDay + (n % 28)) + 1).padStart(2, "0");
    return Number(s.call.run(firmId, `2026-06-${day}T14:00:00Z`, status, reason).lastInsertRowid);
  };

  // Reconciliation set: 132 received = 128 analyzed + 3 excluded + 1 failed.
  const analyzedCallIds = [];
  for (let i = 0; i < 128; i++) analyzedCallIds.push(mkCall("analyzed"));
  mkCall("excluded_duplicate", "Duplicate of an earlier recording");
  mkCall("excluded_duplicate", "Duplicate of an earlier recording");
  mkCall("excluded_not_intake", "Vendor call, not an intake");
  mkCall("failed_audio_quality", "Audio too quiet to transcribe reliably");

  // Four leaked-signable flags on the first four analyzed calls.
  CALLERS.forEach((c, i) => {
    const callId = analyzedCallIds[i];
    s.nameCall.run(c.name, callId);
    const flagId = Number(s.flag.run(callId, firmId, c.score, c.reason, c.caseType).lastInsertRowid);
    s.conf.run(flagId, c.tier);
    s.ver.run(flagId);
    for (const cit of c.citations) {
      s.cite.run(flagId, cit.fact_kind, cit.start_ms, cit.end_ms, cit.verbatim_snippet, cit.validation_score, cit.status);
    }
  });

  return { firmId, callsInserted: n, flagsInserted: CALLERS.length };
}

// Script entry: seed the default local DB (idempotency is not attempted — this is
// a demo helper; re-running creates another demo firm).
if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openMigratedDb(DEFAULT_DB_PATH);
  const result = seedDemo(db);
  db.close();
  console.log("Seeded demo firm:", result);
  console.log('Render sample PDFs at /api/documents/statement and /api/documents/readout.');
}
