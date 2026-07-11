// Missed-cases digest: token signing/verification (the security boundary of
// the no-login action links) and the pure digest builder/renderer. No network,
// no DB — the send path is exercised with an injected mailer and the
// EMAIL_ENABLED gate (email is decoupled from TEST_MODE, which arms SMS only).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  signDigestToken,
  verifyDigestToken,
  LINKABLE_STATUSES,
} from "../messaging/digest-links.mjs";
import {
  buildMissedDigest,
  renderMissedDigest,
  digestSubject,
  sendMissedDigest,
} from "../messaging/missed-digest.mjs";

const ENV = { DIGEST_LINK_SECRET: "test-secret-at-least-16-chars" };

// ── tokens ────────────────────────────────────────────────────────────────

test("token round-trips and carries firm/flag/status", () => {
  const t = signDigestToken({ firmId: 7, flagId: "42", status: "reached_out" }, ENV);
  const v = verifyDigestToken(t, ENV);
  assert.deepEqual(v, { firmId: "7", flagId: "42", status: "reached_out" });
});

test("tampered token is rejected", () => {
  const t = signDigestToken({ firmId: 7, flagId: "42", status: "reached_out" }, ENV);
  const [payload] = t.split(".");
  // Re-sign the payload with a DIFFERENT secret → signature must not verify.
  const forged = signDigestToken(
    { firmId: 7, flagId: "43", status: "reached_out" },
    { DIGEST_LINK_SECRET: "another-secret-16-chars!!" },
  );
  assert.equal(verifyDigestToken(forged, ENV).error, "bad_signature");
  // Payload swap keeps the old signature → also rejected.
  const swapped = `${forged.split(".")[0]}.${t.split(".")[1]}`;
  assert.equal(verifyDigestToken(swapped, ENV).error, "bad_signature");
  assert.ok(payload.length > 0);
});

test("expired token is rejected", () => {
  const past = Math.floor(Date.now() / 1000) - 60;
  const t = signDigestToken({ firmId: 1, flagId: 2, status: "reached_out", exp: past }, ENV);
  assert.equal(verifyDigestToken(t, ENV).error, "expired");
});

test("missing/short secret fails closed on both sides", () => {
  assert.throws(() => signDigestToken({ firmId: 1, flagId: 2, status: "reached_out" }, {}));
  assert.throws(() =>
    signDigestToken({ firmId: 1, flagId: 2, status: "reached_out" }, { DIGEST_LINK_SECRET: "short" }),
  );
  const t = signDigestToken({ firmId: 1, flagId: 2, status: "reached_out" }, ENV);
  assert.equal(verifyDigestToken(t, {}).error, "not_configured");
});

test("only workflow statuses are linkable — terminal outcomes are not", () => {
  assert.ok(LINKABLE_STATUSES.includes("reached_out"));
  assert.ok(!LINKABLE_STATUSES.includes("signed"));
  assert.throws(() => signDigestToken({ firmId: 1, flagId: 2, status: "signed" }, ENV));
});

// ── builder / renderer ────────────────────────────────────────────────────

const FIRM = { id: 9, name: "Test Firm LLP" };
const FLAGS = [
  { id: 1, caller_name: "Maria G.", caller_phone: "+15105551234", case_type: "mva", save_status: null, confidence_tier: "strong", reason: "Rear-ended, treated same day", received_at: "2026-07-09" },
  // Left a message but not yet resolved — stays on the list so the next attempt happens.
  { id: 2, caller_name: "Left A Message", caller_phone: "+15105550001", case_type: "mva", save_status: "reached_out", confidence_tier: "strong", reason: "vm", received_at: "2026-07-08" },
  // Terminal outcome — leaves the digest.
  { id: 3, caller_name: "Already Signed", caller_phone: "+15105550000", case_type: "mva", save_status: "signed", confidence_tier: "strong", reason: "x", received_at: "2026-07-08" },
];

test("builder keeps every non-terminal miss (incl. left-a-message), drops only resolved ones", () => {
  const d = buildMissedDigest({ firm: FIRM, flags: FLAGS, callsReceived: 14 });
  assert.equal(d.missCount, 2); // Maria (needs callback) + Left A Message (second attempt due)
  const names = d.items.map((i) => i.name);
  assert.ok(names.includes("Maria G."));
  assert.ok(names.includes("Left A Message"));
  assert.ok(!names.includes("Already Signed"));
  assert.equal(d.callsReceived, 14);
});

test("zero-miss day still produces a digest with the all-clear subject", () => {
  const d = buildMissedDigest({ firm: FIRM, flags: [FLAGS[2]], callsReceived: 14 });
  assert.equal(d.missCount, 0);
  assert.match(digestSubject(d), /14 calls read, all handled/);
});

test("render includes tel: link and signed confirm link; no PII in the URL", () => {
  const d = buildMissedDigest({ firm: FIRM, flags: FLAGS });
  const html = renderMissedDigest(d, { appUrl: "https://x.test", env: ENV });
  assert.match(html, /tel:\+15105551234/);
  const m = html.match(/\/digest\/confirm\?token=([^"]+)/);
  assert.ok(m, "confirm link present");
  const token = decodeURIComponent(m[1]);
  assert.ok(!token.includes("Maria"), "no name in token");
  assert.ok(!/15105551234/.test(token), "no phone in token");
  const v = verifyDigestToken(token, ENV);
  assert.equal(v.status, "reached_out");
  assert.equal(String(v.flagId), "1");
});

test("render degrades to desk links when no secret is configured", () => {
  const d = buildMissedDigest({ firm: FIRM, flags: FLAGS });
  const html = renderMissedDigest(d, { appUrl: "https://x.test", env: {} });
  assert.ok(!html.includes("/digest/confirm"), "no action links without secret");
  assert.match(html, /\/desk\/queue/);
});

// ── send gating ───────────────────────────────────────────────────────────

test("EMAIL_ENABLED off (default) renders to file and never calls the mailer", async () => {
  const dir = mkdtempSync(join(tmpdir(), "digest-"));
  try {
    let mailed = 0;
    const store = {
      listLeakedFlags: async () => FLAGS,
      getCallReconciliation: async () => ({ received: 14 }),
    };
    // TEST_MODE=false on purpose: email must stay off until EMAIL_ENABLED=true,
    // no matter what the SMS switches say.
    const res = await sendMissedDigest({
      store,
      db: {},
      firm: FIRM,
      recipients: ["a@b.c"],
      mailer: async () => { mailed++; return { id: "x" }; },
      env: { ...ENV, TEST_MODE: "false", RESEND_API_KEY: "set" },
      outDir: dir,
    });
    assert.equal(res.mode, "test");
    assert.match(String(res.reason), /EMAIL_ENABLED/);
    assert.equal(mailed, 0);
    const files = readdirSync(dir);
    assert.equal(files.length, 1);
    assert.match(readFileSync(join(dir, files[0]), "utf8"), /Maria G\./);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("KILL_SWITCH halts email even when EMAIL_ENABLED is on", async () => {
  const dir = mkdtempSync(join(tmpdir(), "digest-"));
  try {
    let mailed = 0;
    const store = {
      listLeakedFlags: async () => FLAGS,
      getCallReconciliation: async () => ({ received: 14 }),
    };
    const res = await sendMissedDigest({
      store,
      db: {},
      firm: FIRM,
      recipients: ["a@b.c"],
      mailer: async () => { mailed++; return { id: "x" }; },
      env: { ...ENV, KILL_SWITCH: "true", EMAIL_ENABLED: "true", RESEND_API_KEY: "set", RESEND_FROM: "d@x.t" },
      outDir: dir,
    });
    assert.equal(res.mode, "test");
    assert.match(String(res.reason), /KILL_SWITCH/);
    assert.equal(mailed, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("live mode (EMAIL_ENABLED, TEST_MODE still on) uses the mailer; zero recipients skips", async () => {
  const store = {
    listLeakedFlags: async () => FLAGS,
    getCallReconciliation: async () => ({ received: 14 }),
  };
  const sent = [];
  // TEST_MODE=true: SMS stays simulated; email is armed independently.
  const env = { ...ENV, TEST_MODE: "true", EMAIL_ENABLED: "true", RESEND_API_KEY: "k", RESEND_FROM: "d@x.t" };
  const res = await sendMissedDigest({
    store, db: {}, firm: FIRM, recipients: ["owner@firm.com"],
    mailer: async (m) => { sent.push(m); return { id: "id1" }; }, env,
  });
  assert.equal(res.mode, "live");
  assert.deepEqual(sent[0].to, ["owner@firm.com"]);
  assert.match(sent[0].subject, /2 missed cases need a callback/);

  const skipped = await sendMissedDigest({
    store, db: {}, firm: FIRM, recipients: [],
    mailer: async () => { throw new Error("must not send"); }, env,
  });
  assert.equal(skipped.mode, "skipped");
});
