// Seed the local Intake QA database with ZERO real data:
//   * 1 synthetic firm
//   * 10 synthetic calls (a mix of leaked-signable and not)
//   * a flag per call
//   * for each leaked-signable call: a conversation (pending_approval, with a
//     REQUIRED consent_basis) and a DRAFTED outbound message awaiting approval
//
// Run: node web/scripts/seed-db.mjs   (or: npm --prefix web run db:seed)
// Idempotent: clears the tables first, so re-running gives the same result.

import { openMigratedDb } from "../db/connection.mjs";

const db = openMigratedDb();

// Fixed base date so the seed is reproducible.
const BASE = new Date("2026-07-01T17:00:00Z");
const iso = (daysAgo, hour = 10) => {
  const d = new Date(BASE);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
};

// 10 calls. `leaked` => intake let a signable case slip (re-engagement candidate).
const CALLS = [
  { source: "callrail", name: "Sam Ortiz",       phone: "+15550100101", type: "mva_standard",     score: 44, leaked: 1, reason: "Strong rear-end MVA with injury; intake never took a callback number or set an attorney follow-up." },
  { source: "callrail", name: "Dana Whitfield",  phone: "+15550100102", type: "slip_and_fall",    score: 51, leaked: 1, reason: "Signable premises fall; caller rushed off the line before qualification finished." },
  { source: "manual",   name: "Marcus Bell",     phone: "+15550100103", type: "dog_bite",         score: 39, leaked: 1, reason: "Clear dog-bite liability; intake quoted a fee and lost the caller." },
  { source: "callrail", name: "Priya Nair",      phone: "+15550100104", type: "med_mal_referral", score: 47, leaked: 1, reason: "High-value med-mal referral; no next step scheduled, caller said they'd 'call around'." },
  { source: "callrail", name: "Jordan Lee",      phone: "+15550100105", type: "mva_commercial",   score: 88, leaked: 0, reason: "Signed on first call; full qualification and attorney handoff completed." },
  { source: "callrail", name: "Alicia Gomez",    phone: "+15550100106", type: "mva_standard",     score: 84, leaked: 0, reason: "Signed on first call; strong handling." },
  { source: "manual",   name: "Trevor Hoang",    phone: "+15550100107", type: "premises",         score: 81, leaked: 0, reason: "Booked attorney consult; clean intake." },
  { source: "callrail", name: "Bianca Rossi",    phone: "+15550100108", type: "mva_standard",     score: 66, leaked: 0, reason: "No injury and no treatment; correctly not pursued." },
  { source: "callrail", name: "Omar Haddad",     phone: "+15550100109", type: "other",            score: 58, leaked: 0, reason: "Workers-comp matter outside PI scope; correctly declined." },
  { source: "manual",   name: "Grace Kim",       phone: "+15550100110", type: "other",            score: 62, leaked: 0, reason: "Statute of limitations expired; not signable." },
];

const DRAFT_TEMPLATE = (name) =>
  `Hi ${name}, this is the intake team at Meridian Injury Law following up on your call. ` +
  `We'd still like to help with your case — is now a good time for a quick callback? ` +
  `Reply STOP to opt out.`;

// --- Clear existing rows (FK-safe order) so re-runs are clean -----------------
for (const t of ["recoveries", "outcomes", "messages", "conversations", "flags", "calls", "firms"]) {
  db.exec(`DELETE FROM ${t};`);
  db.exec(`DELETE FROM sqlite_sequence WHERE name = '${t}';`);
}

// --- Firm ---------------------------------------------------------------------
const firmId = Number(
  db
    .prepare(
      `INSERT INTO firms (name, avg_case_fee, timezone, subscription_price, kill_switch)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run("Meridian Injury Law", 8500, "America/Los_Angeles", 1500, 1).lastInsertRowid
);

const insCall = db.prepare(
  `INSERT INTO calls (firm_id, source, external_call_id, recording_url, transcript, caller_phone, caller_name, received_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const insFlag = db.prepare(
  `INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable, reason)
   VALUES (?, ?, ?, ?, ?)`
);
const insConv = db.prepare(
  `INSERT INTO conversations (flag_id, firm_id, caller_phone, status, consent_basis)
   VALUES (?, ?, ?, ?, ?)`
);
const insMsg = db.prepare(
  `INSERT INTO messages (conversation_id, direction, body, status, approved_by, sent_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);

let conversations = 0;
let messages = 0;

CALLS.forEach((c, i) => {
  const callId = Number(
    insCall.run(
      firmId,
      c.source,
      c.source === "callrail" ? `CR-${1000 + i}` : null,
      c.source === "callrail" ? `https://recordings.example/cr-${1000 + i}.mp3` : null,
      `[synthetic transcript for ${c.name} — ${c.type}]`,
      c.phone,
      c.name,
      iso(28 - i * 2, 9 + (i % 6)) // spread across ~4 weeks
    ).lastInsertRowid
  );

  const flagId = Number(
    insFlag.run(callId, firmId, c.score, c.leaked, c.reason).lastInsertRowid
  );

  // Leaked-signable calls become re-engagement conversations with a DRAFTED
  // (unsent, unapproved) outbound message — the human-approval queue's input.
  if (c.leaked) {
    const convId = Number(
      insConv.run(flagId, firmId, c.phone, "pending_approval", "inbound_call_inquiry_EBR")
        .lastInsertRowid
    );
    conversations++;
    insMsg.run(convId, "outbound", DRAFT_TEMPLATE(c.name.split(" ")[0]), "drafted", null, null);
    messages++;
  }
});

// --- Row counts ---------------------------------------------------------------
const TABLES = ["firms", "calls", "flags", "conversations", "messages", "outcomes", "recoveries"];
console.log(`Seeded ${db.constructor.name} at web/data/intakeqa.db\n`);
console.log("Row counts:");
for (const t of TABLES) {
  const { n } = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get();
  console.log(`  ${t.padEnd(14)} ${n}`);
}

db.close();
