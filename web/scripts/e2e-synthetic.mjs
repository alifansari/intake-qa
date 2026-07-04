// End-to-end SYNTHETIC pipeline — the whole recovery loop on fake data, with
// TEST_MODE forced ON so NOTHING is ever transmitted. Run from the repo root:
//
//   npm run e2e-synthetic
//
// It exercises every stage the real product runs, wired to deterministic FAKES
// (no Claude, no AssemblyAI, no Twilio, no Dropbox Sign, no Resend, no network,
// no keys, no cost): ingest 10 calls -> score -> flag signable -> draft first
// messages -> auto-approve -> mock-send outside quiet hours -> simulate 3 inbound
// replies (STOP / a question / "yes send the agreement") -> sandbox e-sign the
// "yes" -> generate the weekly reconciliation HTML.
//
// Each stage prints a "PASS <stage>" or "FAIL <stage> — <why>" line. Any FAIL
// sets a non-zero exit code so this doubles as a smoke test / CI gate.
//
// This is a self-contained harness: it uses a throwaway temp DB and an injected
// env object ({ TEST_MODE:"true", ... }) — it never touches process.env, the
// real database, or the network. The compliance chokepoint (send.mjs) still
// enforces every guardrail; TEST_MODE simply mocks the final transmit.

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";

import { openMigratedDb } from "../db/connection.mjs";
import { ingestCallRail } from "../ingest/callrail.mjs";
import { ingestManual } from "../ingest/manual.mjs";
import { scoreUnscored } from "../ingest/score-worker.mjs";
import { approveMessage, getMessage } from "../ingest/db.mjs";
import { sendMessage } from "../messaging/send.mjs";
import { ingestInbound } from "../messaging/inbound.mjs";
import { initiateHandoff } from "../messaging/handoff.mjs";
import { completeSignatureRequest } from "../messaging/outcome.mjs";
import { sendWeeklyReport } from "../messaging/weekly-report.mjs";

// --- Harness config -------------------------------------------------------

const SECRET = "e2e-callrail-secret";
const AVG_FEE = 8500;
const SUBSCRIPTION = 1500;

// Force the pilot guardrails: sends simulated, master kill OFF (so the send
// chokepoint isn't short-circuited before we can prove TEST_MODE mocks), quiet
// hours 8pm–8am. The firm runs on UTC and we drive everything at noon UTC so
// the mock-send is unambiguously OUTSIDE quiet hours and every timestamp buckets
// into the current reconciliation week.
const ENV = {
  TEST_MODE: "true",
  KILL_SWITCH: "false",
  QUIET_HOURS_START: "20",
  QUIET_HOURS_END: "8",
};

const now = new Date();
now.setUTCHours(12, 0, 0, 0); // noon UTC today — outside quiet hours (20→8)

// 10 synthetic calls: 4 leaked-signable (signable + not converted), 6 not.
const CALLS = [
  { source: "callrail", name: "Sam Ortiz",      phone: "+15550100101", overall: 44, signability: "likely_signable",   confidence: "high",   outcome: "no_ask",              expLeaked: true },
  { source: "callrail", name: "Dana Whitfield", phone: "+15550100102", overall: 51, signability: "likely_signable",   confidence: "medium", outcome: "no_ask",              expLeaked: true },
  { source: "manual",   name: "Marcus Bell",    phone: "+15550100103", overall: 39, signability: "likely_signable",   confidence: "low",    outcome: "caller_deferred",     expLeaked: true },
  { source: "callrail", name: "Priya Nair",     phone: "+15550100104", overall: 47, signability: "likely_signable",   confidence: "high",   outcome: "follow_up_committed", expLeaked: true },
  { source: "callrail", name: "Jordan Lee",     phone: "+15550100105", overall: 88, signability: "likely_signable",   confidence: "high",   outcome: "signed_on_call",      expLeaked: false },
  { source: "callrail", name: "Alicia Gomez",   phone: "+15550100106", overall: 84, signability: "likely_signable",   confidence: "high",   outcome: "signed_on_call",      expLeaked: false },
  { source: "manual",   name: "Trevor Hoang",   phone: "+15550100107", overall: 81, signability: "likely_signable",   confidence: "high",   outcome: "appointment_set",     expLeaked: false },
  { source: "callrail", name: "Bianca Rossi",   phone: "+15550100108", overall: 66, signability: "needs_development", confidence: "medium", outcome: "no_ask",              expLeaked: false },
  { source: "callrail", name: "Omar Haddad",    phone: "+15550100109", overall: 58, signability: "likely_declinable", confidence: "high",   outcome: "n_a",                 expLeaked: false },
  { source: "manual",   name: "Grace Kim",      phone: "+15550100110", overall: 62, signability: "needs_development", confidence: "low",    outcome: "no_ask",              expLeaked: false },
];

// The three simulated inbound replies (rest never reply). One STOP (opt-out),
// one question, one "yes send the agreement" (drives the e-sign).
const INBOUND = {
  "+15550100101": "STOP",                         // Sam — opt-out
  "+15550100102": "What would the fee be?",       // Dana — a question
  "+15550100104": "Yes, please send the agreement", // Priya — intent to proceed
};
const ESIGN_PHONE = "+15550100104"; // Priya — the "yes" that gets e-signed

// --- Fakes (deterministic, no network) ------------------------------------

function makeFakeScorer(expByCallId) {
  return async ({ callId }) => {
    const e = expByCallId.get(String(callId));
    return {
      call_id: String(callId),
      case_signability: e.signability,
      classification_confidence: e.confidence,
      conversion: { retainer_outcome: e.outcome },
      scores: { overall: e.overall, confidence: e.confidence },
      summary: `Synthetic score for ${e.name}`,
    };
  };
}

// Names the firm + caller, includes opt-out, stays under the SMS cap.
async function fakeDrafter({ user }) {
  const firm = user.match(/FIRM NAME: (.+)/)?.[1]?.trim() || "the firm";
  const first = user.match(/CALLER FIRST NAME: (.+)/)?.[1]?.trim() || "there";
  return `Hi ${first}, this is the intake team at ${firm} following up on your call. Happy to answer any questions — no obligation. Reply STOP to opt out.`;
}

// A sender that MUST NEVER run in TEST_MODE — if it does, that's a guardrail
// breach and the SEND stage fails.
let realSenderCalled = false;
async function forbiddenSender() {
  realSenderCalled = true;
  return { sid: "SHOULD_NOT_HAPPEN" };
}

// Sandbox e-sign provider: returns a fake signature request + link, embedded.
async function fakeEsignProvider() {
  return {
    signature_request_id: "sig_e2e_priya",
    sign_url: "https://app.hellosign.com/sandbox/sig_e2e_priya",
    embedded: true,
  };
}

// --- PASS/FAIL reporting --------------------------------------------------

let failures = 0;
function report(stage, ok, detail = "") {
  if (ok) {
    console.log(`PASS ${stage}${detail ? " — " + detail : ""}`);
  } else {
    failures++;
    console.log(`FAIL ${stage}${detail ? " — " + detail : ""}`);
  }
  return ok;
}

// --- Run ------------------------------------------------------------------

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-e2e-"));
  const db = openMigratedDb(join(dir, "e2e.db"));

  const firmId = Number(
    db
      .prepare(
        `INSERT INTO firms (name, avg_case_fee, timezone, subscription_price, kill_switch)
         VALUES (?, ?, ?, ?, 0)`
      )
      .run("Meridian Injury Law (E2E)", AVG_FEE, "UTC", SUBSCRIPTION).lastInsertRowid
  );

  console.log("\nIntake QA — end-to-end synthetic pipeline (TEST_MODE=true, no sends)\n");

  try {
    // STAGE 1 — INGEST 10 calls via both paths (signed CallRail webhook + manual).
    // Received an hour ago so every call is inside the 72h re-engage window.
    const receivedAt = new Date(Date.now() - 3600 * 1000).toISOString();
    const expByCallId = new Map();
    for (const c of CALLS) {
      const transcript = `[synthetic transcript for ${c.name}]`;
      let callId;
      if (c.source === "callrail") {
        const payload = JSON.stringify({
          id: `CR-${c.phone}`,
          customer_name: c.name,
          customer_phone_number: c.phone,
          transcription: transcript,
          start_time: receivedAt,
        });
        const signature = createHmac("sha256", SECRET).update(payload, "utf8").digest("hex");
        callId = ingestCallRail({ db, rawBody: payload, signature, secret: SECRET, firmId }).id;
      } else {
        const tPath = join(dir, `${c.name.replace(/\s/g, "_")}.txt`);
        writeFileSync(tPath, transcript);
        callId = ingestManual({
          db, firmId, transcriptPath: tPath,
          callerName: c.name, callerPhone: c.phone, receivedAt,
        }).id;
      }
      expByCallId.set(String(callId), c);
    }
    const callCount = db.prepare("SELECT COUNT(*) AS n FROM calls").get().n;
    report("1 INGEST", callCount === 10, `${callCount}/10 calls ingested (CallRail + manual)`);

    // STAGE 2 — SCORE every call with the fake scorer; drafts happen in-line.
    const flags = await scoreUnscored({
      db, scorer: makeFakeScorer(expByCallId), drafter: fakeDrafter, firmId,
    });
    report("2 SCORE", flags.length === 10, `${flags.length}/10 calls scored`);

    // STAGE 3 — FLAG: exactly the 4 leaked-signable leads are flagged.
    const leaked = flags.filter((f) => f.is_leaked_signable === 1);
    report("3 FLAG", leaked.length === 4, `${leaked.length}/4 leaked-signable flags`);

    // STAGE 4 — DRAFT: one compliant first-message per leaked lead, all 'drafted'.
    const drafts = db.prepare("SELECT * FROM messages WHERE direction = 'outbound'").all();
    const draftsOk =
      drafts.length === 4 &&
      drafts.every(
        (m) => m.status === "drafted" && m.body && /stop/i.test(m.body) && m.body.length <= 320
      );
    report("4 DRAFT", draftsOk, `${drafts.length}/4 compliant first-messages drafted`);

    // STAGE 5 — APPROVE: human-in-the-loop approval of all 4 drafts.
    for (const m of drafts) approveMessage(db, m.id, "e2e-operator");
    const approvedCount = db
      .prepare("SELECT COUNT(*) AS n FROM messages WHERE status = 'approved'")
      .get().n;
    report("5 APPROVE", approvedCount === 4, `${approvedCount}/4 messages approved`);

    // STAGE 6 — SEND: mock-send each through the chokepoint at noon UTC (outside
    // quiet hours). TEST_MODE simulates; the real sender must NEVER be called.
    let simulated = 0;
    for (const m of drafts) {
      const res = await sendMessage({ db, messageId: m.id, sender: forbiddenSender, env: ENV, now });
      if (res.sent && res.mode === "test") simulated++;
    }
    const sentCount = db
      .prepare("SELECT COUNT(*) AS n FROM messages WHERE status = 'sent'")
      .get().n;
    report(
      "6 SEND",
      simulated === 4 && sentCount === 4 && !realSenderCalled,
      `${simulated}/4 simulated (real sender called: ${realSenderCalled})`
    );

    // STAGE 7 — INBOUND: 3 simulated replies. STOP opts out; the other two draft
    // a reply into the approval queue (never auto-sent).
    let optedOut = 0;
    let repliesDrafted = 0;
    for (const [phone, body] of Object.entries(INBOUND)) {
      const res = await ingestInbound({ db, firmId, from: phone, body, drafter: fakeDrafter, now });
      if (res.optedOut) optedOut++;
      else if (res.drafted) repliesDrafted++;
    }
    report(
      "7 INBOUND",
      optedOut === 1 && repliesDrafted === 2,
      `${optedOut} opt-out (STOP), ${repliesDrafted} reply drafts queued`
    );

    // STAGE 8 — E-SIGN: sandbox signature request for the "yes" caller, then
    // simulate the completion webhook -> signed outcome + recovery at avg fee.
    const priyaConv = db
      .prepare(
        `SELECT cv.id FROM conversations cv
           JOIN flags f ON f.id = cv.flag_id
           JOIN calls c ON c.id = f.call_id
          WHERE c.caller_phone = ?`
      )
      .get(ESIGN_PHONE);
    const handoff = await initiateHandoff({
      db, conversationId: priyaConv.id, kind: "esign",
      esignProvider: fakeEsignProvider, env: ENV, now,
    });
    const complete = completeSignatureRequest({
      db, signatureRequestId: handoff.signatureRequestId, now,
    });
    const recovery = db
      .prepare("SELECT * FROM recoveries WHERE conversation_id = ?")
      .get(priyaConv.id);
    const convStatus = db
      .prepare("SELECT status FROM conversations WHERE id = ?")
      .get(priyaConv.id).status;
    const esignOk =
      complete.handled &&
      recovery &&
      recovery.signed === 1 &&
      recovery.fee_amount === AVG_FEE &&
      convStatus === "closed";
    report(
      "8 E-SIGN",
      esignOk,
      `signed recovery $${recovery?.fee_amount ?? 0}, conversation ${convStatus}`
    );

    // STAGE 9 — RECONCILE: render the weekly report to HTML (TEST_MODE = no email).
    // Only the signed case counts toward recovered $ (honesty layer). The HTML is
    // self-contained, so it's written to web/output/ (default) to persist for the
    // founder to open even after this throwaway DB is torn down.
    const rep = await sendWeeklyReport({
      db, firmId, weekDate: now, env: ENV, now,
    });
    const recovered = rep.data.recoveredFees;
    const reconcileOk =
      rep.mode === "test" &&
      recovered === AVG_FEE &&
      rep.data.signedCount === 1;
    report(
      "9 RECONCILE",
      reconcileOk,
      `$${recovered} recovered, ${rep.data.multiple}× subscription -> ${rep.file}`
    );

    console.log(
      failures === 0
        ? `\nAll stages PASS — full loop verified end-to-end with nothing transmitted.\n`
        : `\n${failures} stage(s) FAILED.\n`
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nE2E crashed: ${err.stack || err.message}`);
  process.exit(1);
});
